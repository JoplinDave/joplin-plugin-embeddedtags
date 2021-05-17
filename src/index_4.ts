import joplin from 'api';
import { MenuItemLocation, ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function () {

		const panels = joplin.views.panels;
        const view = await (panels as any).create();
		await panels.setHtml(view, 'Loading...');

		await panels.addScript(view, './webview.js');

		const dialogs = joplin.views.dialogs;
		const modalTags = await dialogs.create('modalTags');

		await joplin.settings.registerSection('emdeddedTagsSection', {
			label: 'Embedded Tags',
			iconName: 'fas fa-tags',
		});
		
		await joplin.settings.registerSetting('embeddedTagSettingAllTags', {
			value: true,
			type: 3,
			section: 'emdeddedTagsSection',
			public: true,
			label: 'List all tags for selection rather than just the tags already on the note',
			description: 'This will list ALL Joplin tags, including those that are not attached to notes',
		});

		await joplin.settings.registerSetting('embeddedTagSettingCreateNewTag', {
			value: true,
			type: 3,
			section: 'emdeddedTagsSection',
			public: true,
			label: 'Allow new tags to be created through the Emdedded Tag plugin',
			description: 'This will create a new tag that is only embedded in this note.',
		});		

		await joplin.settings.registerSetting('embeddedTagSettingAddTag', {
			value: true,
			type: 3,
			section: 'emdeddedTagsSection',
			public: true,
			label: 'Add selected or created tag to note',
			description: 'This will add a newly created tag Joplin and attach it to the note',
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
				if(allTags == true)
				{
					tags = await joplin.data.get(['tags']);
				
				} else {

					tags = await joplin.data.get(['notes', note.id, 'tags']);
				}

				// option to allow the creation of a new tag
				if(newTags == true)
				{
					var createNewTag = '<br>OR<br><br><label>Enter a new tag</label><br><input type="text" name="createNewTag"><br><br>If you complete both fields, the new tag will be ignored.';

				} else {

					var createNewTag = '';
				}

				let options = '<option value=""></option><br>';

				for (var i = 0, l = tags.items.length; i < l; i++)
				{
					options += '<option value="'+tags.items[i].title+'">'+tags.items[i].title+'</option>';
				}

				await dialogs.setHtml(modalTags, `
					<h3>Tags</h3>
					<hr>
					<form name="titleForm">
						<label>Select a tag</label>
						<select name="selectTag" id="selectTag"> 
						`+options+`
						</select><br>
						`+createNewTag+`
					</form>
					<style src="#" onload="document.getElementById('selectTag').focus()"></style>
					`);
				

				let result = await dialogs.open(modalTags);

				if (result.id != "cancel")
				{
					var selectedTag = result.formData.titleForm.selectTag;
					var newTagToCreate = result.formData.titleForm.createNewTag;

					if(selectedTag)
					{				
						var replacementText = '<span class="xxxx" data-tag="'+selectedTag+'">'+selectedText+'</span>';
						await joplin.commands.execute('replaceSelection', replacementText);

					} else if(newTagToCreate) {

						var replacementText = '<span class="xxxx" data-tag="'+newTagToCreate+'">'+selectedText+'</span>';
						await joplin.commands.execute('replaceSelection', replacementText);

						// add new tag to DB and then note
						const newTag = await joplin.data.post(['tags'], null, {title: newTagToCreate.toLocaleLowerCase()});
						await joplin.data.post(['tags', newTag.id, 'notes'], null, {id: note.id});
					}
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
				var action = message.action;
				var line = message.line;
				var ch1 = message.ch - 6;
				var ch2 = ch1 + 4;
				var ch3 = ch1 + 2;			
						
				// Note this plugin really needs scollToLine functionality here which is not available

				if (action == "addClass")
				{
					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: ['yell', {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});

				} else if(action == "removeClass") {
					
					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: ['xxxx', {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});

				} else {
					
					joplin.commands.execute('editor.execCommand', {
						name: 'replaceRange',
						args: ['fyel', {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
					});

					setTimeout(function()
					{ 
						joplin.commands.execute('editor.execCommand', {
							name: 'replaceRange',
							args: ['xxxx', {line: line, ch: ch1}, {line: line, ch: ch2}, origin],
						});

					}, 15000);
				}

			}

			if (message.name === 'refreshTags')
			{
				updateTagView();
			}
		});

		async function updateTagView()
		{
			const note = await joplin.workspace.selectedNote();

			if (note)
			{
				var headers = noteTags(note.body);
				//alert(JSON.stringify(headers));

				await panels.setHtml(view, '');
				var itemHtml = [];
				
				for (const header of headers)
				{
					itemHtml.push(`
						<p style="padding-left:8px">
							<button class="embedded_tag" href="#" data-line="`+header.lineNo+`" data-ch="`+header.position+`" data-action="">
								`+header.tag+`
							</button>
							<button class="embedded_tag" href="#" data-line="`+header.lineNo+`" data-ch="`+header.position+`" data-action="addClass">
								Show
							</button>
							<button class="embedded_tag" href="#" data-line="`+header.lineNo+`" data-ch="`+header.position+`" data-action="removeClass">
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
					<div class="footer" style="border:1px solid #ddd; margin:4px; padding:4px; font-size:1.2rem;">
						<button class="refresh_tags">Refresh list</buttton>	
					</div>
				`);

			} else {

				await panels.setHtml(view, 'Please select a note to view the table of content');
			}
		}

		await joplin.views.toolbarButtons.create('toggleTag', 'toggleTag', ToolbarButtonLocation.NoteToolbar);

		await joplin.views.menuItems.create('embeddedTagsViaMenu', 'selectEmbeddedTag', MenuItemLocation.EditorContextMenu, { accelerator: "Ctrl+Alt+E" });	


/*
await joplin.workspace.onNoteSelectionChange(() => {
            updateTocView();
        });
        await joplin.workspace.onNoteChange(() => {
            updateTocView();
        });
        await joplin.settings.onChange(() => {
            updateTocView();
        });
*/
		updateTagView();
	}

});

function noteTags(noteBody:string)
{
	const headers = [];
	const lines = noteBody.split('\n');
	let CurrentLineNo = 0;

	for (const line of lines)
	{
		//const re = /<span data-tag/g;
		const re = /data-tag/g;
		var match;
		
		while(match = re.exec(line)){ // data-tag found
			//alert('match found at line number: '+CurrentLineNo+' chr number: '+match.index); 

			//split line at this data-tag
			var subLine = line.substring(match.index);

			// get text between first set of quotes. This will be the data-tag
			var tag = subLine.match(/"(.*?)"/);

		  	headers.push({
				tag: tag[1],
				position: match.index,
				lineNo: String(CurrentLineNo),
			});
		}

		CurrentLineNo++;
	}

	//alert(JSON.stringify(headers));
	return headers;
}