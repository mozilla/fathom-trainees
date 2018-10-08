/** React to commands sent from the background script. */

function foundLabelIsTraineeId(facts, traineeId) {
    // The default success function for a ruleset is to match on elements with a
    // data-fathom attribute containing the traineeId.
    // Using the first found node is arbitrary.
    const found = facts.get(traineeId);
    return found.length ? found[0].element.dataset.fathom === traineeId : false;
}

async function dispatch(request) {
    if (request.type === 'rulesetSucceeded') {
        // Run the trainee ruleset of the given ID with the given coeffs
        // over the document, and report whether it found the right
        // element.
        const trainee = trainees.get(request.traineeId);
        const rules = trainee.rulesetMaker(request.coeffs);
        const facts = rules.against(window.document);
        const successFunc = trainee.successFunction || foundLabelIsTraineeId;
        return successFunc(facts, request.traineeId);
    }
    return Promise.resolve({});
}
browser.runtime.onMessage.addListener(dispatch);
