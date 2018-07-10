/** Handle messages that come in from the FathomFox webext. */
async function handleExternalMessage(request, sender, sendResponse) {
    console.log('got external message');
    if (request.type === 'rulesetSucceededOnTabs') {
        // Run a given ruleset on a given set of tabs, and return an array
        // of bools saying whether they got the right answer on each.
        return Promise.all(request.tabIds.map(
            tabId => browser.tabs.sendMessage(
                tabId,
                {type: 'rulesetSucceeded',
                 trainableId: request.trainableId,
                 coeffs: request.coeffs})));
    } else if (request.type === 'trainableKeys') {
        console.log('got request for keys');  // To get this to fire, reload the FathomFox extension, then reopen the Training page.
        console.log(request);
        // Return an array of IDs of rulesets we can train.
        return 'response!'; //trainables.keys());
    } else if (request.type === 'trainableCoeffs') {
        // Return the initial coeffs of some ruleset.
        return 'response again!'; //trainables.keys());
        //sendResponse(trainables.get(request.trainableId).coeffs);
    }
}
browser.runtime.onMessageExternal.addListener(handleExternalMessage);
