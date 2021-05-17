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


		

		await joplin.commands.register({
			name: 'selectEmbeddedTag',
			label: 'Select embedded tag',
			iconName: '',
			execute: async () => {

				//Get active note, needed to get specific tags
				const note = await joplin.workspace.selectedNote();

				// get selected section
				const selectedText = (await joplin.commands.execute('selectedText') as string);

				// this gets all tags not just note tags
				//let tags = await joplin.data.get(['tags']);

				let tags = await joplin.data.get(['notes', note.id, 'tags']);

				let options = '<option value=""></option>';

				for (var i = 0, l = tags.items.length; i < l; i++)
				{
					options += '<option value="'+tags.items[i].title+'">'+tags.items[i].title+'</option>';
				}

				await dialogs.setHtml(modalTags, `
					<h3>Select a tag</h3>
					<hr>
					<form name="titleForm">
						<select name="selectTag" id="selectTag">
						`+options+`
						</select><br>
					</form>
					<style src="#" onload="document.getElementById('selectTag').focus()"></style>
					`);

				let result = await dialogs.open(modalTags);

				if (result.id != "cancel")
				{
					var selectedTag = result.formData.titleForm.selectTag;
					var replacementText = '<span style="" data-tag="'+selectedTag+'">'+selectedText+'</span>';
					await joplin.commands.execute('replaceSelection', replacementText);
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
			if (message.name === 'tagSelected') {

				var line = message.line;
				var ch = message.ch -2;
				var ch1 = ch+20;


				joplin.commands.execute('editor.execCommand', {
					name: 'replaceRange',
					args: ['background: #ffff00;', {line: line, ch: ch}],
				});

				var colourList = ["ffff11", "ffff22", "ffff33", "ffff44", "ffff55", "ffff66", "ffff77", "ffff88", "ffff99", "ffffaa", "ffffbb", "ffffcc", "ffffdd", "ffffee", "ffffff", "end"];

				var colourIndex = 0;
		
				var handler = setInterval(function() {
					
					var colour = colourList[colourIndex];

					if(colour == "start")
					{
						joplin.commands.execute('editor.execCommand', {
							name: 'replaceRange',
							args: ['background: #ffff00;', {line: line, ch: ch}],
						});

					} else if(colour == "end") {

						joplin.commands.execute('editor.execCommand', {
							name: 'replaceRange',
							args: ['', {line: line, ch: ch}, {line: line, ch: ch1}],
						});

					} else {

						joplin.commands.execute('editor.execCommand', {
							name: 'replaceRange',
							args: ['background: #'+colour+';', {line: line, ch: ch}, {line: line, ch: ch1}],
						});
					}

					colourIndex++;
					if (colourIndex >= colourList.length) {
						clearInterval(handler);
					}
				}, 1500);
			}
		});

		async function updateTagView() {
		
			const note = await joplin.workspace.selectedNote();

			if (note) {
				const headers = noteTags(note.body);

				const itemHtml = [];
				for (const header of headers) {

					itemHtml.push(`
						<p style="padding-left:8px">
							<a class="embedded_tag" href="#" data-line="`+header.lineNo+`" data-ch="`+header.position+`">
								`+header.tag+`
							</a>
						</p>
					`);
				}

				await panels.setHtml(view, `
					<div class="header" style="text-align: center; border:1px solid #ddd; margin:4px; padding:4px; font-size:1.2rem;">
						Embedded Tags
					</div>
					<div class="container" style="border:1px solid #ddd; margin:4px;">
						${itemHtml.join('\n')}
					</div>
					<div class="footer" style="border:1px solid #ddd; margin:4px; padding:4px; font-size:1.2rem;">
						&nbsp;
					</div>
				`);
			} else {
				await panels.setHtml(view, 'Please select a note to view the table of content');
			}
		}

		await joplin.views.toolbarButtons.create('toggleTag', 'toggleTag', ToolbarButtonLocation.NoteToolbar);

		await joplin.views.menuItems.create('embeddedTagsViaMenu', 'selectEmbeddedTag', MenuItemLocation.EditorContextMenu, { accelerator: "Ctrl+Alt+E" });	

		joplin.workspace.onNoteChange(() => {
			updateTagView();
		});

		updateTagView();
	}

});

function noteTags(noteBody:string) {

	const headers = [];
	const lines = noteBody.split('\n');
	let CurrentLineNo = 0;

	for (const line of lines) {

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