# Joplin Embedded Tags Plugin

A plugin for [Joplin](https://joplinapp.org/) that allows 'Embedded' or local tags to be inserted in your notes in specific locations. Embedded tags can be separate from the system tags that are linked to notes, although you may choose to replicate or add to the system tags.

Sometimes tags are put on a note because of one particular word, sentence or paragraph in the note. Returning to the note, it's not always obvious what section of the note caused you to put the tag on to start with.

You may also use embedded tags to find and highlight specific sections of a note for faster viewing or retrieval. If for example, you store scientific papers in Joplin and you wished to find and highlight a particular citation, then you can apply an embedded tag to this section of your note.

**Requires Joplin 1.8.1+ and only works in markdown editor**

## Install

Go to tools->Options->Plugins and install the file joplin.plugin.embeddedtags.jpl found in the publish directory of the GitHub repository.

See required CSS below.

## Usage

To insert an embedded tag, open the Code Mirror (MD) editor and highlight the text that you want to be wrapped in an embedded tag. Right click and select 'Select embedded tag' on the menu that appears. You will have a number options available.

You can (dependant upon your settings) -

- Select an existing tag already attached to your note (most common use)
- Select a global tag that is not already attached to your note (but may be attached to other notes)
- Create a new embedded tag
- If you've selected a global tag, or created a new tag, you can attach the embedded tag to the note
- Select a highlight colour
- Choose to immediately apply the embedded tag to the section.

You may view and manipulate your embedded tags by clicking on the 'Show/hide embedded tags' button on the toolbar, which will open the Embedded Tags pane.

From here you can - 

- view or hide individual embedded tags
- highlight a tag using a solid and permanent colour, or a fading highlight
- selecting a tag will scroll the viewer to the location of the tag
- view all embedded tags of a particular colour
- hide all embedded tags of a particular colour
- view all embedded tags
- hide all embedded tags

## Required CSS

For Embedded tags to work correctly, you need to add the following CSS to your application. Goto Tools->Options->Appearance->Show Advanced Settings and click the 'Edit' button under 'Custom stylesheet for rendered Markdown'. Cut and paste in the following CSS.

```
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
```

## Upgrading from version 0.1.0 to 1.0.0

This upgrade contains a new function where the selection of a tag makes the viewer scroll to that location. Tags applied under previous versions will not scroll. You have two options - 
- Remove existing tags and then reapply them.
- Add the following to the SPAN id="12345678" data-hash="12345678" 

If you follow the second option, make sure that you add the new attributes AFTER the initial class within the SPAN e.g.

```<span class="greenxxxxx" id="12345678" data-hash="12345678" data-tag="second" data-colour="green">My tagged text</span>```

The numbers "12345678" above are just an example. Each tag should have it's own random string for "id" and "data-hash" within any particular note.