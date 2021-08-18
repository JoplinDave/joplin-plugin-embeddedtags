import joplin from 'api';
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function () {

		const panels = joplin.views.panels;
    const view = await (panels as any).create("embedded-tags");
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
		
		await joplin.settings.registerSettings({
			'embeddedTagSettingAllTags': {
				value: true,
				type: 3,
				section: 'emdeddedTagsSection',
				public: true,
				label: 'Use global tags instead of note tags.',
				description: 'This will list ALL Joplin tags, regardless of whether they are attached to the current, or any other note.',
			},
			'embeddedTagSettingCreateNewTag': {
				value: true,
				type: 3,
				section: 'emdeddedTagsSection',
				public: true,
				label: 'Allow new tags to be created.',
				description: 'This will allow the creation an embedded tag. By default, this will not create a note tag.',
			}
		});
		
		await joplin.commands.register({
			name: 'selectEmbeddedTag',
			label: 'Select embedded tag',
			iconName: '',
			execute: async () => {

				//Get option
				const allTags = await joplin.settings.value('embeddedTagSettingAllTags');
				const newTags = await joplin.settings.value('embeddedTagSettingCreateNewTag');
				//const addTags = await joplin.settings.value('embeddedTagSettingAddTag')

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
					tagOptions += '<option value="'+tags.items[i].id+'">'+tags.items[i].title+'</option>';
				}

				// option to allow the creation of a new tag
				let createNewTag = '';
				if(newTags == true)
				{
					createNewTag = '<br>OR<br><br><label>Enter a new tag</label><br><input type="text" name="createNewTag"><br><br>If you complete both fields, the new tag will be ignored.';
				}

				let addTags = '';
				if(allTags || newTags)
				{
					addTags = '<br><br><label><input type="checkbox" name="attach" id="attach" value="1">If not already, attach tag to this note.</label>';
				}

				let colours = '<option value="blue">Blue</option><option value="green">Green</option><option value="red">Red</option><option value="yellow" selected>Yellow</option>'

				await dialogs.setHtml(modalTags, `
				<style>body{width:300px;}</style>
					<b>Tags
					<hr></b>
					<form name="titleForm">
						<label>Select an existing tag:</label>
						<select name="TagId" id="TagId"> 
						${tagOptions}
						</select> <br>
						${createNewTag}
						${addTags}
						<br><br><label>Select a highlight colour:</label>
						<select name="colour" id="colour"> 
						${colours}
						</select>
						<br><br><label><input type="checkbox" name="apply" id="apply" value="1">Apply highlight immediately.</label>
						<br><br>
					</form>
					<style src="#" onload="document.getElementById('TagId').focus()"></style>
					`);
				
				let result = await dialogs.open(modalTags);

				if (result.id != "cancel")
				{
					let selectedTagId = result.formData.titleForm.TagId;
					let newTagToCreate = result.formData.titleForm.createNewTag;
					let attach = result.formData.titleForm.attach;
					let colour = result.formData.titleForm.colour;
					let apply = result.formData.titleForm.apply;

					let colourToApply
					if (apply){

						colourToApply = colour;

					} else {

						colourToApply = "xxxxxxxxxx";
					}

					if(selectedTagId)
					{
						// Get name from ID and insert in note
						let tagName = '';
						for (var i = 0, l = tags.items.length; i < l; i++)
						{
							if(tags.items[i].id == selectedTagId)
							{
								tagName = tags.items[i].title;
							}
						}

						let replacementText = '<span class="'+colourToApply+'" data-tag="'+tagName+'" data-colour="'+colour+'">'+selectedText+'</span>';
						await joplin.commands.execute('replaceSelection', replacementText);

						if(attach) // If attach to note is true
						{
							if(allTags) // global tags were used so it already exists.
							{
								 // Check to see if in local
								 // If IN local exit
								 // If NOT in local attach using selectedTagId

								// get tags just for this note
								tags = await joplin.data.get(['notes', note.id, 'tags'], { fields: ['id', 'title'], order_by: 'title'});

								let tagIdFound;
								for (var i = 0, l = tags.items.length; i < l; i++)
								{
									if(tags.items[i].id == selectedTagId)
									{
										tagIdFound = tags.items[i].id;
									}
								}

								if(!tagIdFound)
								{
									await joplin.data.post(['tags', selectedTagId, 'notes'], null, {id: note.id});	
								}

							} // If local tags were used this means that it will already be attached.

						}

					} else if(newTagToCreate) {

						// Insert in note using the name given
						let replacementText = '<span class="'+colourToApply+'" data-tag="'+newTagToCreate+'" data-colour="'+colour+'">'+selectedText+'</span>';
						await joplin.commands.execute('replaceSelection', replacementText);

						if(attach) // If attach to note is true
						{
							// User could have typed 'new' tag which already exists in global or local, so need to check

							if(allTags) // global tags were used and are already loaded
							{
								// Check to see if in global
								 // if NOT in global, then it doesn't exist. Create and attach using name
								 // If IN global, check to see if in local
								 // If IN local exit
								 // If NOT in local, create and attach using name

								let tagIdFound
								for (var i = 0, l = tags.items.length; i < l; i++)
								{
									if(tags.items[i].title == newTagToCreate)
									{
										tagIdFound = tags.items[i].id;
									}
								}

								if(!tagIdFound)
								{
									const newTag = await joplin.data.post(['tags'], null, {title: newTagToCreate.toLocaleLowerCase()});
									await joplin.data.post(['tags', newTag.id, 'notes'], null, {id: note.id});

								} else {

									// get tags just for this note
									tags = await joplin.data.get(['notes', note.id, 'tags'], { fields: ['id', 'title'], order_by: 'title'});

									let tagFound;
									for (var i = 0, l = tags.items.length; i < l; i++)
									{
										if(tags.items[i].title == newTagToCreate)
										{
											tagFound = tags.items[i].id;
										}
									}

									if(!tagFound)
									{
										await joplin.data.post(['tags', tagIdFound, 'notes'], null, {id: note.id});
									}
								}

							} else { // local tags were used and are already loaded

								// Check to see if in local
								// If IN local exit
								// If NOT in local, check to see if in global
								// If IN global, just attach using ID
								// If NOT in global create and attach using name

								let tagFound;
								for (var i = 0, l = tags.items.length; i < l; i++)
								{
									if(tags.items[i].title == newTagToCreate)
									{
										tagFound = tags.items[i].id;
									}
								}

								if(!tagFound)
								{
									// get all tags
									tags = await joplin.data.get(['tags'], { fields: ['id', 'title'], order_by: 'title'});

									let tagFound
									for (var i = 0, l = tags.items.length; i < l; i++)
									{
										if(tags.items[i].title == newTagToCreate)
										{
											tagFound = tags.items[i].id;
										}
									}

									if(tagFound)
									{
										await joplin.data.post(['tags', tagFound, 'notes'], null, {id: note.id});

									} else {

										const newTag = await joplin.data.post(['tags'], null, {title: newTagToCreate.toLocaleLowerCase()});
										await joplin.data.post(['tags', newTag.id, 'notes'], null, {id: note.id});
									}
								}
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

				// **********************************************************************************************
				// Note this plugin really needs scollToLine functionality here which is not available to plugins
				// **********************************************************************************************

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

			if (message.name === 'showAll' ||
				message.name === 'hideAll' ||
				message.name === 'showBlue' ||
				message.name === 'hideBlue' ||
				message.name === 'showRed' ||
				message.name === 'hideRed' ||
				message.name === 'showGreen' ||
				message.name === 'hideGreen' ||
				message.name === 'showYellow' ||
				message.name === 'hideYellow'		
			)
			{
				const note = await joplin.workspace.selectedNote();

				let headers
				if (note)
				{
					headers = noteTags(note.body, message.name);
				}
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

				await dialogs.setButtons(analyseTags, [{id: 'Cancel'}]);

				await dialogs.setHtml(analyseTags, `
					<style>body{width:500px;}</style>
					<b>Analyse Tags
					<hr></b>
					Embedded tags do not have have to mirror or reflect linked tags to the note.
					<br><br>
					<table>
					<tr><th style="text-align: left;">Note tags</th><th style="text-align: left;">Embedded tags</th></tr>
					<tr><td style="vertical-align: top;"><ul>${noteTagList}</ul></td style="vertical-align: top; text-align: left;"><td><ul>${embeddedTagList}</ul></td></tr>
					</table>
				`);

				let analyse = await dialogs.open(analyseTags);
			}

			if (message.name === 'help')
			{
				await dialogs.setButtons(help, [{id: 'Cancel'}]);

				await dialogs.setHtml(help, `
				<style>body{min-width:500px; min-height=100px;}</style>
					<b>Embedded Tags
					<hr></b>

					Embedded tags are separate from the tags that are directly linked to the note that you are curently editing/viewing (note tags), or other tags that may or may be linked to ther notes (global tags). You may however choose to replicate note tags, or global tags.

					<br><br>

					You may also use embedded tags to find and highlight specific sections of a note for faster viewing or retrieval. If for example, you store scientific papers in Joplin and you wished to find and highlight a particular citation, then you can apply an embedded tag to this section of your note.

					<br><br>

					<u>How to use</u>

					<br>

					To insert an Embedded tag, open the Code Mirror (MD) editor and highlight the text that you want to be wrapped in an embedded tag. Right click and select 'Select embedded tag' on the menu that appears. You will have a number options available.

					<br><br>

					You can (dependant upon your settings) -

					<br><br> 1. Select an existing tag already attached to your note
					<br> 2. Select a system tag that is not attached to your note
					<br> 3. Create a new embedded tag
					<br> 4. Choose to attach the new tag to the note
					<br> 5. Select a highlight colour
					<br> 6. Choose to immediately apply the hightlight to the section.
					
					<br><br>

					Entering a new Embedded tag will cause the list to refresh.

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
					<textarea width="120" rows=4>
					
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
				headers = noteTags(note.body, null);
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
				let headers = noteTags(note.body, null);
				//alert(JSON.stringify(headers));

				await panels.setHtml(view, '');
				let itemHtml = [];

				let show_blue = '';
				let hide_blue = '';
				let show_green = '';
				let hide_green = '';
				let show_red = '';
				let hide_red = '';
				let show_yellow = '';
				let hide_yellow = '';

				console.log(headers);

				if(headers.length >0)
				{
					for (const header of headers)
					{
						// establish if colour has been used to show show/hide colour buttons
						switch(header.colour){
							case "red":
								show_red = '<button class="btn show_red red" style="margin-right:4px; float:left;">&nbsp;&nbsp;</button>';
								hide_red = '<button class="btn hide_red red" style="margin-right:4px; float:left;">&nbsp;&nbsp;</button>';
								break;
							case "blue":
								show_blue = '<button class="btn show_blue blue" style="margin-right:4px; float:left;">&nbsp;&nbsp;</button>';
								hide_blue = '<button class="btn hide_blue blue" style="margin-right:4px; float:left;">&nbsp;&nbsp;</button>';
								break;
							case "green":
								show_green = '<button class="btn show_green green" style="margin-right:4px; float:left;">&nbsp;&nbsp;</button>';
								hide_green = '<button class="btn hide_green green" style="margin-right:4px; float:left;">&nbsp;&nbsp;</button>';
								break;
							case "yellow":
								show_yellow = '<button class="btn show_yellow yellow" style="margin-right:4px; float:left;">&nbsp;&nbsp;</button>';
								hide_yellow = '<button class="btn hide_yellow yellow" style="margin-right:4px; float:left;">&nbsp;&nbsp;</button>';
								break;
							}

						itemHtml.push(`
							<p style="padding-left:8px">

								<button class="embedded_tag btn `+header.colour+`" style="" href="#" data-line="`+header.lineNo+`" data-ch="${header.position}" data-colour="${header.colour}" data-action="addClass" title="Highlight with solid colour - [Line: ${header.lineNo}]">
								${header.tag}
								</button>

								<button class="embedded_tag btn ${header.colour}`+'-grad'+`" href="#" data-line="${header.lineNo}" data-ch="`+header.position+`"  data-colour="`+header.colour+`" data-action="" title="Highlight with colour fade - [Line: ${header.lineNo}]">
									Fade
								</button>
								
								<button class="embedded_tag btn" href="#" data-line="${header.lineNo}" data-ch="${header.position}" data-colour="${header.colour}" data-action="removeClass" title="Hide colour">
									Hide
								</button>	

							</p>
						`);
					}

					await panels.setHtml(view, `
					<div class="header" style="text-align: center; border:1px solid #ddd; margin:4px; padding:4px; font-size:1.2rem;">
						Embedded Tags
					</div>
					<div class="container" style="border:1px solid #ddd; margin:4px;">
						${itemHtml.join('\n')}
						<br>
						<p style="padding-left:8px">
						<button class="show_all btn" style="margin-right:4px; float:left;" title="Show all tags">Show all</buttton>
						${show_blue} ${show_green} ${show_red} ${show_yellow}
						</p>
						<br>
						<p style="padding-left:8px">
						<button class="hide_all btn" style="margin-right:4px; float:left;" title="Hide all tags">Hide all</buttton>
						${hide_blue} ${hide_green} ${hide_red} ${hide_yellow}
						</p>
						<br><br>
					</div>
					<div class="footer" style="border:1px solid #ddd; margin:4px; padding:4px; font-size:1.2rem;">
						<button class="analyse btn"style="margin-right:4px; float:left;" title="Analyse embedded v linked tags">Analyse tags</buttton>
						<button class="help btn" style="float:right;" title="Open help window">Help</buttton>
					</div>
				`);

				} else {

					await panels.setHtml(view, `
					<div class="header" style="text-align: center; border:1px solid #ddd; margin:4px; padding:4px; font-size:1.2rem;">
						Embedded Tags
					</div>
					<div class="container" style="border:1px solid #ddd; margin:4px;">
					<p style="padding-left:8px">
						There are no emdedded tags for this note.	
					</p>
					</div>
					<div class="footer" style="border:1px solid #ddd; margin:4px; padding:4px; font-size:1.2rem;">
						<br><button class="analyse btn"style="margin-right:4px; float:left;" title="Analyse embedded v linked tags">Analyse tags</buttton>
						<button class="help btn" style="float:right;" title="Open help window">Help</buttton>
					</div>
					`);

				}

			} else {

				await panels.setHtml(view, 'Please select a note to view the embedded tag list');
			}
		}

		await joplin.views.toolbarButtons.create('toggleTag', 'toggleTag', ToolbarButtonLocation.NoteToolbar);
		await joplin.views.menuItems.create('embeddedTagsViaMenu', 'selectEmbeddedTag', MenuItemLocation.EditorContextMenu);	

		await joplin.workspace.onNoteSelectionChange(() => {
            updateTagView();
        });

		await joplin.workspace.onNoteChange(() => {
			updateTagView();
		});
        
		await joplin.settings.onChange(() => {
            updateTagView();
        });

		updateTagView();
	}

});

function noteTags(noteBody:string, action:string)
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

			if(action == null)
			{
				headers.push({
					tag: dataTag[1],
					position: match.index,
					lineNo: String(CurrentLineNo),
					colour: dataColour[1]
				});

			} else {

				if(action == 'showAll')
				{
					let line = String(CurrentLineNo);
					let ch1 = match.index + Number(13);
					let ch2 = Number(ch1) + Number(10);
					let displayColour = "";

					switch(dataColour[1]){
						case "red":
							displayColour="redxxxxxxx";
							break;
						case "blue":
							displayColour="bluexxxxxx"
							break;
						case "green":
							displayColour="greenxxxxx"
							break;
						case "yellow":
							displayColour="yellowxxxx"
							break;
						default:
							displayColour = "yellowxxxx";
					}

					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: [displayColour, {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});

				} else if(action == 'hideAll') {

					let line = String(CurrentLineNo);
					let ch1 = match.index + Number(13);
					let ch2 = Number(ch1) + Number(10);
					let displayColour = "xxxxxxxxxx";

					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: [displayColour, {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});

				} else if(action == 'showBlue' && dataColour[1] == 'blue') {

					let line = String(CurrentLineNo);
					let ch1 = match.index + Number(13);
					let ch2 = Number(ch1) + Number(10);
					let displayColour="bluexxxxxx"

					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: [displayColour, {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});

				} else if(action == 'hideBlue' && dataColour[1] == 'blue') {

					let line = String(CurrentLineNo);
					let ch1 = match.index + Number(13);
					let ch2 = Number(ch1) + Number(10);
					let displayColour = "xxxxxxxxxx";

					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: [displayColour, {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});

				} else if(action == 'showGreen' && dataColour[1] == 'green') {
				
					let line = String(CurrentLineNo);
					let ch1 = match.index + Number(13);
					let ch2 = Number(ch1) + Number(10);
					let displayColour="greenxxxxx"

					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: [displayColour, {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});					
				
				} else if(action == 'hideGreen' && dataColour[1] == 'green') {
				
					let line = String(CurrentLineNo);
					let ch1 = match.index + Number(13);
					let ch2 = Number(ch1) + Number(10);
					let displayColour = "xxxxxxxxxx";

					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: [displayColour, {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});

				} else if(action == 'showRed' && dataColour[1] == 'red') {
				
					let line = String(CurrentLineNo);
					let ch1 = match.index + Number(13);
					let ch2 = Number(ch1) + Number(10);
					let displayColour="redxxxxxxx";

					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: [displayColour, {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});					
				
				} else if(action == 'hideRed' && dataColour[1] == 'red') {
				
					let line = String(CurrentLineNo);
					let ch1 = match.index + Number(13);
					let ch2 = Number(ch1) + Number(10);
					let displayColour = "xxxxxxxxxx";

					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: [displayColour, {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});
				
				} else if(action == 'showYellow' && dataColour[1] == 'yellow') {
				
					let line = String(CurrentLineNo);
					let ch1 = match.index + Number(13);
					let ch2 = Number(ch1) + Number(10);
					let displayColour = "yellowxxxx";

					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: [displayColour, {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});
				
				} else if(action == 'hideYellow' && dataColour[1] == 'yellow') {

					let line = String(CurrentLineNo);
					let ch1 = match.index + Number(13);
					let ch2 = Number(ch1) + Number(10);
					let displayColour = "xxxxxxxxxx";

					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: [displayColour, {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});
				}
			}
		}

		CurrentLineNo++;
	}

	//alert(JSON.stringify(headers));
	return headers;
}
