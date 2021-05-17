import joplin from 'api';
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function () {

		const panels = joplin.views.panels;
        const view = await (panels as any).create();
		await panels.setHtml(view, 'Loading...');

		await panels.addScript(view, './webview.js');
		await panels.addScript(view, './webview.css');

		const dialogs = joplin.views.dialogs;
		const modalTags = await dialogs.create('modalTags');
		const analyseTags = await dialogs.create('analyseTags');
		const help = await dialogs.create('help');

		await joplin.settings.registerSection('emdeddedTagsSection', {
			label: 'Embedded Tags',
			iconName: 'fas fa-tags',
		});
		
		await joplin.settings.registerSetting('embeddedTagSettingAllTags', {
			value: true,
			type: 3,
			section: 'emdeddedTagsSection',
			public: true,
			label: 'List global tags instead of the tags aready attached to the note.',
			description: 'This will list ALL Joplin tags, regardless of whether they are attached to this or any other note.',
		});

		await joplin.settings.registerSetting('embeddedTagSettingCreateNewTag', {
			value: true,
			type: 3,
			section: 'emdeddedTagsSection',
			public: true,
			label: 'Allow embedded tags to be created.',
			description: 'This will only create an embedded tag. It will not create a Joplin tag, or attach it to the note.',
		});		

		await joplin.settings.registerSetting('embeddedTagSettingAddTag', {
			value: true,
			type: 3,
			section: 'emdeddedTagsSection',
			public: true,
			label: 'Attach selected or new embedded tag to the note.',
			description: 'This will either create and/or attach the tag to the note.',
		});
		
		await joplin.commands.register({
			name: 'selectEmbeddedTag',
			label: 'Select embedded tag',
			iconName: '',
			execute: async () => {

				//Get option
				const allTags = await joplin.settings.value('embeddedTagSettingAllTags');
				const newTags = await joplin.settings.value('embeddedTagSettingCreateNewTag');
				const addTags = await joplin.settings.value('embeddedTagSettingAddTag')

				//Get active note, needed to get specific tags
				const note = await joplin.workspace.selectedNote();

				// get selected section
				const selectedText = (await joplin.commands.execute('selectedText') as string);

				//option to show all tags or only tags on the note
				let tags;
				if(allTags == true) // all tags
				{
					tags = await joplin.data.get(['tags'], { fields: ['id', 'title'], order_by: 'title'});
				
				} else { // only tags attched to this note

					tags = await joplin.data.get(['notes', note.id, 'tags'], { fields: ['id', 'title'], order_by: 'title'});
				}

				let tagOptions = '<option value=""></option>';

				for (var i = 0, l = tags.items.length; i < l; i++)
				{
					tagOptions += '<option value="'+tags.items[i].title+'">'+tags.items[i].title+'</option>';
				}

				// option to allow the creation of a new tag
				let createNewTag = '';
				if(newTags == true)
				{
					createNewTag = '<br>OR<br><br><label>Enter a new tag</label><br><input type="text" name="createNewTag"><br><br>If you complete both fields, the new tag will be ignored.';
				}

				let colours = '<option value="blue">Blue</option><option value="green">Green</option><option value="red">Red</option><option value="yellow" selected>Yellow</option>'

				await dialogs.setHtml(modalTags, `
				<style>body{width:300px;}</style>
					<h3>Tags</h3>
					<hr>
					<form name="titleForm">
						<label>Select an existing tag</label>
						<select name="selectTag" id="selectTag"> 
						`+tagOptions+`
						</select> <br>
						`+createNewTag+`
						<br><br><label>Select a highlight colour</label>
						<select name="colour" id="colour"> 
						`+colours+`
						</select>
						<br><br><label><input type="checkbox" name="apply" id="apply" value="1">Apply highlight immediately</label>
						<br><br>
					</form>
					<style src="#" onload="document.getElementById('selectTag').focus()"></style>
					`);
				
				let result = await dialogs.open(modalTags);

				if (result.id != "cancel")
				{
					let selectedTag = result.formData.titleForm.selectTag;
					let newTagToCreate = result.formData.titleForm.createNewTag;
					let colour = result.formData.titleForm.colour;
					let apply = result.formData.titleForm.apply;

					let colourToApply
					if (apply){

						colourToApply = colour;

					} else {

						colourToApply = "xxxxxxxxxx";
					}

					if(selectedTag)
					{				
						let replacementText = '<span class="'+colourToApply+'" data-tag="'+selectedTag+'" data-colour="'+colour+'">'+selectedText+'</span>';
						await joplin.commands.execute('replaceSelection', replacementText);

						if(addTags && allTags) // check whether the tag is already attached to the note
						{
							// get tags just for this note
							tags = await joplin.data.get(['notes', note.id, 'tags'], { fields: ['id', 'title'], order_by: 'title'});

							let tagFoundId;
							for (var i = 0, l = tags.items.length; i < l; i++)
							{
								if(tags.items[i].title == selectedTag)
								{
									tagFoundId = tags.items[i].id;
								}
							}

							if(!tagFoundId)
							{
								// get all tags as we need the id of the selected tag
								tags = await joplin.data.get(['tags'], { fields: ['id', 'title'], order_by: 'title'});

								for (var i = 0, l = tags.items.length; i < l; i++)
								{
									if(tags.items[i].title == selectedTag)
									{
										tagFoundId = tags.items[i].id;
									}
								}

								await joplin.data.post(['tags', tagFoundId, 'notes'], null, {id: note.id});
							}
						}

					} else if(newTagToCreate) {

						let replacementText = '<span class="'+colourToApply+'" data-tag="'+newTagToCreate+'" data-colour="'+colour+'">'+selectedText+'</span>';
						await joplin.commands.execute('replaceSelection', replacementText);

						if(addTags)
						{
							// need to check whether the new tag is already exists and was just not selected
							// i.e. the user has duplicated it
							if(!allTags)
							{
								// get all tags
								tags = await joplin.data.get(['tags'], { fields: ['id', 'title'], order_by: 'title'});
							}

							let tagFoundId;
							for (var i = 0, l = tags.items.length; i < l; i++)
							{
								if(tags.items[i].title == newTagToCreate.toLocaleLowerCase())
								{
									tagFoundId = tags.items[i].id;
								}
							}

							if(tagFoundId) // tag already exists, but it attached?
							{
								// get note tags
								tags = await joplin.data.get(['notes', note.id, 'tags'], { fields: ['id', 'title'], order_by: 'title'});

								let tagFoundId2;
								for (var i = 0, l = tags.items.length; i < l; i++)
								{
									if(tags.items[i].title == newTagToCreate.toLocaleLowerCase())
									{
										tagFoundId2 = tags.items[i].id;
									}
								}

								if(!tagFoundId2) // attach tag to note
								{
									await joplin.data.post(['tags', tagFoundId, 'notes'], null, {id: note.id});
								}

							} else { // tag does not exist, so create and attach

								const newTag = await joplin.data.post(['tags'], null, {title: newTagToCreate.toLocaleLowerCase()});
								await joplin.data.post(['tags', newTag.id, 'notes'], null, {id: note.id});
							}
						}
					}

					setTimeout(function()
					{ 
						updateTagView();

					}, 1500);

				}
			}
		})

		await joplin.commands.register({
			name: 'toggleTag',
			label: 'Show/Hide Embedded Tags',
			iconName: 'fas fa-tags',
			execute: async () => {
				const isVisible = await (panels as any).visible(view);
				(panels as any).show(view, !isVisible);
			},
		});

		await panels.onMessage(view, async (message: any) => {

			if (message.name === 'tagSelected')
			{
				let action = message.action;
				let line = message.line;
				let colour = message.colour;
				let apply = message.apply;
				let ch = message.ch;

				let ch1 = Number(ch) + Number(13);
				let ch2 = Number(ch1) + Number(10);

				let displayColour = "";
				let displayColourFade = "";
				switch(colour){
					case "red":
						displayColour="redxxxxxxx";
						displayColourFade="redfadexxx";
						break;
					case "blue":
						displayColour="bluexxxxxx"
						displayColourFade="bluefadexx"
						break;
						case "green":
						displayColour="greenxxxxx"
						displayColourFade="greenfadex"
						break;
					case "yellow":
						displayColour="yellowxxxx"
						displayColourFade="yellowfade"
						break;
					default:
						displayColour = "yellowxxxx";
						displayColourFade = "yellowfade";
				}

				// Note this plugin really needs scollToLine functionality here which is not available to plugins

				if (action == "addClass")
				{
					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: [displayColour, {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});

				} else if(action == "removeClass") {
					
					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: ['xxxxxxxxxx', {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});

				} else {
					
					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: [displayColourFade, {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});

					setTimeout(function()
					{ 
						joplin.commands.execute('editor.execCommand', {
							name: 'replaceRange',
							args: ['xxxxxxxxxx', {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
						});

					}, 15000);
				}

			}

			if (message.name === 'refreshTags')
			{
				updateTagView();
			}

			if (message.name === 'analyse')
			{
				const note = await joplin.workspace.selectedNote();

				// get tags attched to this note
				let noteTags = await joplin.data.get(['notes', note.id, 'tags'], { fields: ['title'], order_by: 'title'});
				
				let noteTagList = '';
				for (var i = 0, l = noteTags.items.length; i < l; i++)
				{
					noteTagList += '<li>'+noteTags.items[i].title+'</li>';
				}

				// get embedded tags in this note
				let embeddedTags = await getEmbeddedTagList();

				let embeddedTagList = '';
				for (var x = 0, y = embeddedTags.length; x < y; x++)
				{
					embeddedTagList += '<li>'+embeddedTags[x]+'</li>';
				}

				await dialogs.setHtml(analyseTags, `
					<style>body{width:500px;}</style>
					<h3>Tags</h3>
					<hr>
					It is possible to have more or additional embedded tags then the tags attched to the note.
					<br><br>
					<table>
					<tr><th style="text-align: left;">Note tags</th><th style="text-align: left;">Embedded tags</th></tr>
					<tr><td style="vertical-align: top;"><ul>`+noteTagList+`</ul></td style="vertical-align: top; text-align: left;"><td><ul>`+embeddedTagList+`</ul></td></tr>
					</table>
				`);

				let analyse = await dialogs.open(analyseTags);
			}

			if (message.name === 'help')
			{
				await dialogs.setButtons(help, [{id: 'Cancel'}]);

				await dialogs.setHtml(help, `
				<style>body{min-width:500px;}</style>
					<b>Embedded Tags
					<hr></b>

					Embedded tags are separate and distinct from the system tags, but you may choose to replicate them as embedded tags if you choose.

					<br><br>

					Embedded tags are used to find and highlight specific sections of a note for faster viewing or retrieval. If for example, you store scientific papers in Joplin and you wished to find and highlight a particular citation, then you can wrap this section of your note in an embedded tag 

					<br><br>

					<u>How to use</u>

					<br>

					To insert an Embedded tag, open the Code Mirror (MD) editor and highlight the text that you want to be wrapped in an embedded tag. Right click and select 'Select embedded tag' on the menu that appears. You will have a number options available.

					<br><br>

					You can (dependant upon your settings) -

					<br><br> 1. Select an existing tag already attached to your note
					<br> 2. Select a system tag that is not attached to your note
					<br> 3. Enter a new tag
					<br> 4. Choose to attach the new tag to the note
					<br> 5. Select a highlight colour
					<br> 6. Choose to immediately apply the hightlight to the section.
					
					<br><br>

					Entering a new Embedded tag will cause the list to refresh, or you may refresh it manually if you have made amendments to your note.

					<br><br>

					<u>Settings</u>

					<br>

					Settings for Embedded tags can be found here - Tools->Options->Embedded Tags

					<br><br>

					<u>Note</u>

					<br>

					For Embedded tags to work correctly, you need to add the following CSS to your application. Goto Tools->Options->Appearance->Show Advanced Settings and click the 'Edit' button under 'Custom stylesheet for rendered Markdown'.

					<br><br>

					Scroll to the bottom and then cut and paste in the following -

					<br>
					<textarea width="120">
					
/*---------------------------------------
Embedded tags plugin CSS
---------------------------------------*/

/*** YELLOW ***/
@keyframes yellowfade {
from {
	background: #f5ffa2;
}
to {
	background: transparent;
}
}
.yellowfade {
animation: yellowfade 20s;
}
.yellowxxxx {
background: #f5ffa2;
}

/*** GREEN ***/
@keyframes greenfade {
from {
	background: #aaffa2;
}
to {
	background: transparent;
}
}
.greenfadex {
animation: greenfade 20s;
}
.greenxxxxx {
background: #aaffa2;
}

/*** BLUE ***/
@keyframes bluefade {
from {
	background: #9fd1ff;
}
to {
	background: transparent;
}
}
.bluefadexx {
animation: bluefade 20s;
}
.bluexxxxxx {
background: #9fd1ff;
}

/*** RED ***/
@keyframes redfade {
from {
	background: #ff8b8b;
}
to {
	background: transparent;
}
}
.redfadexxx {
animation: redfade 20s;
}
.redxxxxxxx {
background: #ff8b8b;
}

/*---------------------------------------
Embedded tags plugin CSS - END
---------------------------------------*/

					</textarea>
					
					`);

				await dialogs.open(help);

			}

		});

		async function getEmbeddedTagList()
		{
			const note = await joplin.workspace.selectedNote();

			let headers
			if (note)
			{
				headers = noteTags(note.body);
			}

			let embeddedTags = [];
			for (const header of headers)
			{
				embeddedTags.push(header.tag);
			}

			let uniqueEmbeddedTags = [...new Set(embeddedTags)];
			uniqueEmbeddedTags.sort();
			return uniqueEmbeddedTags;
		}

		async function updateTagView()
		{
			const note = await joplin.workspace.selectedNote();

			if (note)
			{
				let headers = noteTags(note.body);
				//alert(JSON.stringify(headers));

				await panels.setHtml(view, '');
				let itemHtml = [];
				
				for (const header of headers)
				{
					itemHtml.push(`
						<p style="padding-left:8px">

							<!-- <button class="embedded_tag btn `+header.colour+`" href="#" data-line="`+header.lineNo+`" data-ch="`+header.position+`"  data-colour="`+header.colour+`" data-action="">
							`+header.lineNo+`
							</button> -->

							<button class="embedded_tag btn `+header.colour+`" style="" href="#" data-line="`+header.lineNo+`" data-ch="`+header.position+`" data-colour="`+header.colour+`" data-action="addClass">
								`+header.tag+`
							</button>

							<button class="embedded_tag btn `+header.colour+``+'-grad'+`" href="#" data-line="`+header.lineNo+`" data-ch="`+header.position+`"  data-colour="`+header.colour+`" data-action="">
								Fade
							</button>
							
							<button class="embedded_tag btn" href="#" data-line="`+header.lineNo+`" data-ch="`+header.position+`" data-colour="`+header.colour+`" data-action="removeClass">
								Hide
							</button>	

						</p>
					`);
				}

				await panels.setHtml(view, `
					
					${itemHtml.join('\n')}
					
				`);
					
				await panels.setHtml(view, `
					<div class="header" style="text-align: center; border:1px solid #ddd; margin:4px; padding:4px; font-size:1.2rem;">
						Embedded Tags
					</div>
					<div class="container" style="border:1px solid #ddd; margin:4px;">
						${itemHtml.join('\n')}
					</div>
					<div class="footer" style="border:1px solid #ddd; margin:4px; padding:4px; font-size:1.2rem; ">
						<button class="refresh_tags btn" style="margin-right:4px; float:left;">Refresh list</buttton>
						<button class="analyse btn"style="margin-right:4px; float:left;">Analyse tags</buttton>
						<button class="help btn" style="float:right;">Help</buttton>
					</div>
					<!-- <a href="file:///C:/PROGRA~1/Joplin/resources/app.asar/gui/note-viewer/index.html#et1">here</a> -->
					<a href="//index.html#et1">here</a>

				`);

			} else {

				await panels.setHtml(view, 'Please select a note to view the embedded tag list');
			}
		}

		await joplin.views.toolbarButtons.create('toggleTag', 'toggleTag', ToolbarButtonLocation.NoteToolbar);

		await joplin.views.menuItems.create('embeddedTagsViaMenu', 'selectEmbeddedTag', MenuItemLocation.EditorContextMenu);	

		// these triggers have not been included to aid performance
		/*
        await joplin.workspace.onNoteChange(() => {
            updateTocView();
        });
        await joplin.settings.onChange(() => {
            updateTocView();
        });

		//updateTagView();
		*/

		await joplin.workspace.onNoteSelectionChange(() => {
            updateTagView();
        });
	}

});

function noteTags(noteBody:string)
{
	const headers = [];
	const lines = noteBody.split('\n');
	let CurrentLineNo = 0;

	for (const line of lines)
	{
		const regx = /<span\s.*?data-tag.*?>/g; // search for span with data-tag attribute

		let match;
				
		while(match = regx.exec(line)){ // data-tag found
			//alert('match found at line number: '+CurrentLineNo+' chr number: '+match.index+' string: '+match); 

			let regxTag = /data-tag="(.*?)"/g;
			let dataTag = regxTag.exec(match);

			let regxColor = /data-colour="(.*?)"/g;
			let dataColour = regxColor.exec(match);

		  	headers.push({
				tag: dataTag[1],
				position: match.index,
				lineNo: String(CurrentLineNo),
				colour: dataColour[1]
			});
		}

		CurrentLineNo++;
	}

	//alert(JSON.stringify(headers));
	return headers;
}
