import {ruleset, rule, dom, type, score, out} from 'fathom-web';
import {ancestors} from 'fathom-web/utilsForFrontend';
import overlayModel from './models/overlay.js';
import popUpModel from './models/popUp.js';
import closeButtonModel from './models/closeButton.js'

/**
 * Rulesets to train.
 */
const trainees = new Map();


trainees.set(
    // A ruleset that finds the close button associated with a pop-up
    'closeButton',
    closeButtonModel
);

trainees.set(
    'overlay',
    overlayModel
);

trainees.set(
    'popUp',
    popUpModel
);


export default trainees;
