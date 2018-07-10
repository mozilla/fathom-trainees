/** React to commands sent from the background script. */
async function dispatch(request) {
    switch (request.type) {
        case 'rulesetSucceeded':
            // Run the trainable ruleset of the given ID with the given coeffs
            // over the document, and report whether it found the right
            // element.
            const rules = trainables.get(request.trainableId).rulesetMaker(request.coeffs);
            const facts = rules.against(window.document);
            // Assume the out() key and the data-fathom attr are both identical
            // to the key of the trainable in the map.
            const found = facts.get(request.trainableId);
            if (found.length >= 1) {
                const fnode = found[0];  // arbitrary pick
                if (fnode.element.getAttribute('data-fathom') === request.trainableId) {
                    return true;
                }
                //console.log(urlFilename(window.location.href), ": found wrong answer class=", fnode.element.getAttribute('class'), 'id=', fnode.element.getAttribute('id'));
            } else {
                //console.log(urlFilename(window.location.href), ": found nothing.");
            }
            return false;
            break;  // belt, suspenders
    }
    return Promise.resolve({});
}
browser.runtime.onMessage.addListener(dispatch);
