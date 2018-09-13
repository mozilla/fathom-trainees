/** React to commands sent from the background script. */

function labelledSuccessFunction(found, traineeId) {
    // Assume the out() key and the data-fathom attr are both identical
    // to the key of the trainee in the map.
    // Using the first found node is arbitrary.
    return found[0].element.dataset.fathom === traineeId;
}

async function dispatch(request) {
    if (request.type === 'rulesetSucceeded') {
        // Run the trainee ruleset of the given ID with the given coeffs
        // over the document, and report whether it found the right
        // element.
        const trainee = trainees.get(request.traineeId);
        const rules = trainee.rulesetMaker(request.coeffs);
        const successFunc = trainee.successFunction || labelledSuccessFunction;
        const facts = rules.against(window.document);
        const found = facts.get(request.traineeId);
        return found.length ? successFunc(found, request.traineeId) : false;
    }
    return Promise.resolve({});
}
browser.runtime.onMessage.addListener(dispatch);
