/** React to commands sent from the background script. */
async function dispatch(request) {
    switch (request.type) {
        case 'rulesetSucceeded':
            // Run the trainee ruleset of the given ID with the given coeffs
            // over the document, and report whether it found the right
            // element.
            const rules = trainees.get(request.traineeId).rulesetMaker(request.coeffs);
            const facts = rules.against(window.document);
            // Assume the out() key and the data-fathom attr are both identical
            // to the key of the trainee in the map.
            const found = facts.get(request.traineeId);
            if (found.length >= 1) {
                const fnode = found[0];  // arbitrary pick
                if (fnode.element.getAttribute('data-fathom') === request.traineeId) {
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
