/* CLICK EVENTS */
document.addEventListener('click', event => {
    const element = event.target;
  
    if (element.classList.contains('embedded_tag')) {
        webviewApi.postMessage({
            name: 'tagSelected',
            line: element.dataset.line,
            ch: element.dataset.ch,
            hash: element.dataset.hash,
            action: element.dataset.action,
            colour: element.dataset.colour,
            apply: element.dataset.apply,
        });
    }

    if (element.classList.contains('show_all')) {
        webviewApi.postMessage({
            name: 'showAll',
        });
    }

    if (element.classList.contains('hide_all')) {
        webviewApi.postMessage({
            name: 'hideAll',
        });
    }

    if (element.classList.contains('show_blue')) {
        webviewApi.postMessage({
            name: 'showBlue',
        });
    }

    if (element.classList.contains('hide_blue')) {
        webviewApi.postMessage({
            name: 'hideBlue',
        });
    }

    if (element.classList.contains('show_green')) {
        webviewApi.postMessage({
            name: 'showGreen',
        });
    }

    if (element.classList.contains('hide_green')) {
        webviewApi.postMessage({
            name: 'hideGreen',
        });
    }

    if (element.classList.contains('show_red')) {
        webviewApi.postMessage({
            name: 'showRed',
        });
    }

    if (element.classList.contains('hide_red')) {
        webviewApi.postMessage({
            name: 'hideRed',
        });
    }

    if (element.classList.contains('show_yellow')) {
        webviewApi.postMessage({
            name: 'showYellow',
        });
    }

    if (element.classList.contains('hide_yellow')) {
        webviewApi.postMessage({
            name: 'hideYellow',
        });
    }

    if (element.classList.contains('analyse')) {
        webviewApi.postMessage({
            name: 'analyse',
        });
    }

    if (element.classList.contains('help')) {
        
        webviewApi.postMessage({
            name: 'help',
        });
    }
});