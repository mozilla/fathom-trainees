import {ruleset, rule, dom, type, score, out} from 'fathom-web';
import {ancestors} from 'fathom-web/utilsForFrontend';

const popUpModel = {
    coeffs: [2,2,1,2,2],  

     rulesetMaker:
        function ([coeffAncestorArea, coeffForm, coeffClassOrId, coeffCentered, coeffButton]) {

            const ZEROISH = .08;
            const ONEISH = .9;


            function largeAncestor(fnode) {
                const element = fnode.element;
                const ancestor = element.parentElement;

                const elementRect = element.getBoundingClientRect();
                const ancestorRect = ancestor.getBoundingClientRect();

                const elementArea = elementRect.width * elementRect.height;
                const ancestorArea = ancestorRect.width * ancestorRect.height;

                const windowArea = window.innerWidth * window.innerHeight;
                const areaDiff = ancestorArea - elementArea;

                return (trapezoid(areaDiff, 0, windowArea)+1) ** coeffAncestorArea;
            }

            function isCentered(fnode) {
                const element = fnode.element;
                const rect = element.getBoundingClientRect();

                const leftDiff = rect.x;
                const rightDiff = window.innerWidth - rect.x - rect.width;

                const ratio = Math.min(leftDiff, rightDiff)/Math.max(leftDiff, rightDiff);

                const logisticFunction = logisticFuncGenerator(1,0.8, 30, 1);
                return logisticFunction(ratio) ** coeffCentered;
            }

            // exponentially decrease each level's score multiplier
            function containsForm(fnode) {
                const element = fnode.element;
                let queue = [element];
                let formMultiplier = 1;

                for (let i = 1; i < 5; i++){
                    let nextQueue = [];
                    while (queue.length > 0){
                        let e = queue.pop();
                        nextQueue = nextQueue.concat(Array.from(e.children));
                        if (e.nodeName === "FORM"){
                            formMultiplier = formMultiplier * (1+coeffForm/i);
                        }
                    }
                    queue = nextQueue;
                }
                return formMultiplier;
            }


            function suspiciousClassOrId(fnode) {
                const element = fnode.element;
                const attributeNames = ['class', 'id'];
                let numOccurences = 0;
                function numberOfSuspiciousSubstrings(value) {
                    return value.includes('popup') + value.includes('subscription') + value.includes('newsletter')+ value.includes('modal');
                }

                for (const name of attributeNames) {
                    let values = element.getAttribute(name);
                    if (values) {
                        if (!Array.isArray(values)) {
                            values = [values];
                        }
                        for (const value of values) {
                            numOccurences += numberOfSuspiciousSubstrings(value);
                        }
                    }
                }
                
                const logisticFunction = logisticFuncGenerator(2,0,coeffClassOrId);
                return logisticFunction(numOccurences);
            }

            function buttons(fnode) {
                // make more specific queryselector
                let descendants = Array.from(fnode.element.querySelectorAll("*"));
                let buttonCounter = 0;
                for (const d of descendants){
                    if(d.nodeName === "INPUT") {
                        buttonCounter += 1;
                    }
                }
                return (buttonCounter > 4) ? 1 + 1/buttonCounter : buttonCounter;
            }

            

            /* Utility procedures */

            /**
             * Scale a number to the range [ZEROISH, ONEISH].
             *
             * For a rising trapezoid, the result is ZEROISH until the input
             * reaches zeroAt, then increases linearly until oneAt, at which it
             * becomes ONEISH. To make a falling trapezoid, where the result is
             * ONEISH to the left and ZEROISH to the right, use a zeroAt greater
             * than oneAt.
             */
            function trapezoid(number, zeroAt, oneAt) {
                const isRising = zeroAt < oneAt;
                if (isRising) {
                    if (number <= zeroAt) {
                        return ZEROISH;
                    } else if (number >= oneAt) {
                        return ONEISH;
                    }
                } else {
                    if (number >= zeroAt) {
                        return ZEROISH;
                    } else if (number <= oneAt) {
                        return ONEISH;
                    }
                }
                const slope = (ONEISH - ZEROISH) / (oneAt - zeroAt);
                return slope * (number - zeroAt) + ZEROISH;
            }

            // returns a logistic function. Ideally we should input the growth rate as
            // a hyperparameter from the optimization
            function logisticFuncGenerator(maxVal, xMid, growthRate, yInt = 0){
                return x=> ((maxVal)/(1+Math.exp(-1*growthRate*(x-xMid)))+yInt);
            }

            /* The actual ruleset */

            const rules = ruleset(
                rule(dom('div'), type('popUp')),
                rule(dom('form'), type('popUp')),
                rule(type('popUp'), score(largeAncestor)),
                rule(type('popUp'), score(suspiciousClassOrId)),
                rule(type('popUp'), score(containsForm)),
                rule(type('popUp'), score(isCentered)),
                // rule(type('popUp'), score(buttons)),
                rule(type('popUp').max(), out('popUp'))
            );
            return rules;
        }
};

export default popUpModel;