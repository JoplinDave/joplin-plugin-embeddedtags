# Joplin Embedded Tags Plugin

A plugin for [Joplin](https://joplinapp.org/) that allows 'Embedded Tags' to be inserted in your notes. Embedded tags are separate from the tags that are directly linked to the note that you are curently editing/viewing (note tags), or other tags that may or may be linked to ther notes (global tags). You may however choose to replicate note tags, or global tags.

Sometimes tags are put on a note because of one particular word, sentence or paragraph in the note. Returning to the note, it's not always obvious what section of the note relates to the tag. With embedded tags, you can replicate your note tags by adding an embedded tag to the applicable section that caused you to tag the note in the first place.

You may also use embedded tags to find and highlight specific sections of a note for faster viewing or retrieval. If for example, you store scientific papers in Joplin and you wished to find and highlight a particular citation, then you can apply an embedded tag to this section of your note.

**Requires Joplin 1.8.1+ and only works in markdown editor**

## Install

Go to tools->Options->Plugins and install the file joplin.plugin.embeddedtags.jpl found in the publish directory of the GitHub repository.

See required CSS below.

## Usage

To insert an embedded tag, open the Code Mirror (MD) editor and highlight the text that you want to be wrapped in an embedded tag. Right click and select 'Select embedded tag' on the menu that appears. You will have a number options available.

You can (dependant upon your settings) -

- Select an existing tag already attached to your note (most common use)
- Select a global tag that is not already attached to your note
- Create a new embedded tag
- If you've selected a global tag, or created a new tag, you can attach the embedded tag to the note as a note tag
- Select a highlight colour
- Choose to immediately apply the embedded tag to the section.

You may view and manipulate your embedded tags by clicking on the 'Show/hide embedded tags' button on the toolbar, which will open the Embedded Tags pane.

From here you can - 

- view or hide individual embedded tags
- highlight a tag using a solid and permanent colour, or a fading highlight
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

## Scroll to highlight

Ideally I would have liked to have been able to scroll the viewer to the correct position before highlighting the applicable section. Unfortunately the only method available seems to be scrollToHash which is not suitable, so until we have scrollToLine or the abilty to trigger an #anchor tag from a plugin, we need to find the highlighted section manually.