import {ruleset, rule, dom, type, score, out} from 'fathom-web';
import {ancestors} from 'fathom-web/utilsForFrontend';


/**
 * Rulesets to train.
 */
const trainees = new Map();

trainees.set(
    // A ruleset that finds the close button associated with a pop-up
    'closeButton',
    {coeffs: [1,1,1,1,1,1,1,1],

     rulesetMaker:

        function ([coeffSmall, coeffSquare, coeffTopHalfPage, coeffAbsolutePosition, coeffCloseString, coeffModalString, coeffHiddenString, coeffVisible]) {
            
            const ZEROISH = .08;
            
            const ONEISH = .9;

            function small(fnode) {
                const rect = fnode.element.getBoundingClientRect();
                const size = Math.abs(rect.height + rect.width);
                const lowerBound = 25;
                const upperBound = 150;

                return ((size >= lowerBound && size <= upperBound) ? ONEISH : ZEROISH) ** coeffSmall;
            }

            function square(fnode) {
                const rect = fnode.element.getBoundingClientRect();
                const lowerBound = 0.5;
                const upperBound = 1;
                const smallDim = Math.min(rect.height, rect.width);
                const largeDim = Math.max(rect.height, rect.width);

                if (smallDim <= 0 || largeDim <= 0)
                    return ZEROISH ** coeffSquare;

                const ratio = smallDim / largeDim;

                return trapezoid(ratio, lowerBound, upperBound) ** coeffSquare;
            }

            // Function isn't working; How can I tell the diference between a 'div' and 'button' tag?
            function onClick(fnode) {
                //console.log(fnode.element.tagName == 'button');
                return ((fnode.element.hasAttribute("onclick")) ? ONEISH : ZEROISH) ** coeffOnClick;
            }

            function topHalfPage(fnode) {
                const rect = fnode.element.getBoundingClientRect();
                const windowHeight = window.innerHeight;

                return ((rect.top <= windowHeight/2) ? ONEISH : ZEROISH) ** coeffTopHalfPage;
            }
            
            function largeZIndex(fnode) {
                const lowerBound = 0;
                const upperBound = 1000;

                return trapezoid(fnode.element.style.zIndex, lowerBound, upperBound) ** coeffZIndex;
            }

            function absolutePosition(fnode) {
                return ((fnode.element.style.position == "absolute") ? ONEISH : ZEROISH) ** coeffAbsolutePosition;
            }

            /*
            function suspiciousClassOrId(fnode) {
                const element = fnode.element;
                const attributeNames = ['class', 'id', 'type'];
                let numOccurences = 0;
                function numberOfSuspiciousSubstrings(value) {
                    return 3*value.includes('close') + value.includes('modal') + value.includes('button');
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

                // Function is Equivalent to 0.9 - 0.38^(0.1685 + numOccurences)
                return (-((.3 + ZEROISH) ** (numOccurences + .1685)) + ONEISH) ** coeffClassOrId;
            }
            */

            function containsClose(fnode) {
                const element = fnode.element;
                const attributeNames = ['class', 'id', 'type'];
                let numOccurences = 0;
                function numberOfSuspiciousSubstrings(value) {
                    return value.includes('close');
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

                // Function is Equivalent to 0.9 - 0.38^(0.1685 + numOccurences)
                return (-((.3 + ZEROISH) ** (numOccurences + .1685)) + ONEISH) ** coeffCloseString;
            }

            function containsModal(fnode) {
                const element = fnode.element;
                const attributeNames = ['class', 'id'];
                let numOccurences = 0;
                function numberOfSuspiciousSubstrings(value) {
                    return value.includes('modal');
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

                // Function is Equivalent to 0.9 - 0.38^(0.1685 + numOccurences)
                return (-((.3 + ZEROISH) ** (numOccurences + .1685)) + ONEISH) ** coeffModalString;
            }

            function containsHidden(fnode) {
                const element = fnode.element;
                const attributeNames = ['class', 'id'];
                let numOccurences = 0;
                function numberOfSuspiciousSubstrings(value) {
                    return value.includes('hidden');
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

                // Function is Equivalent to 0.9 - 0.38^(0.1685 + numOccurences)
                return (-((.3 + ZEROISH) ** (numOccurences + .1685)) + ONEISH) ** coeffHiddenString;
            }

            /*
            function caselessIncludes(haystack, needle) {
                return haystack.toLowerCase().includes(needle);
            }

            function weightedIncludes(haystack, needle, coeff) {
                return (caselessIncludes(haystack, needle) ? ONEISH : ZEROISH) ** coeff;
            }

            function hasCloseInClassName(fnode) {
                return weightedIncludes(fnode.element.className, 'close', coeffHasCloseInClass);
            }

            function hasCloseInID(fnode) {
                return weightedIncludes(fnode.element.id, 'close', coeffHasCloseInID);
            }
            */

            function visible(fnode) {
                const element = fnode.element;
                for (const ancestor of ancestors(element)) {
                    const style = getComputedStyle(ancestor);
                    if (style.getPropertyValue('visibility') === 'hidden' ||
                        style.getPropertyValue('display') === 'none') {
                        return ZEROISH ** coeffVisible;
                    }
                }
                return ONEISH ** coeffVisible;
            }

            /* Utility procedures */

            /**
             * Return the extracted [r, g, b, a] values from a string like "rgba(0, 5, 255, 0.8)",
             * and scale them to 0..1. If no alpha is specified, return undefined for it.
             */
            function rgbaFromString(str) {
                const m = str.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d+(?:\.\d+)?)\s*)?\)$/i);
                if (m) {
                    return [m[1] / 255, m[2] / 255, m[3] / 255, m[4] === undefined ? undefined : parseFloat(m[4])];
                } else {
                    throw new Error("Color " + str + " did not match pattern rgb[a](r, g, b[, a]).");
                }
            }

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

            /**
             * Return the saturation 0..1 of a color defined by RGB values 0..1.
             */
            function saturation(r, g, b) {
                const cMax = Math.max(r, g, b);
                const cMin = Math.min(r, g, b);
                const delta = cMax - cMin;
                const lightness = (cMax + cMin) / 2;
                const denom = (1 - (Math.abs(2 * lightness - 1)));
                // Return 0 if it's black (R, G, and B all 0).
                return (denom === 0) ? 0 : delta / denom;
            }

            /* The actual ruleset */

            const rules = ruleset(
                rule(dom('div,button,a,i,span'), type('closeButton')),
                rule(type('closeButton'), score(small)),
                rule(type('closeButton'), score(square)),
                //rule(type('closeButton'), score(onClick)),
                rule(type('closeButton'), score(topHalfPage)),
                //rule(type('closeButton'), score(zIndex)),
                rule(type('closeButton'), score(absolutePosition)),
                //rule(type('closeButton'), score(suspiciousClassOrId)),
                rule(type('closeButton'), score(containsClose)),
                rule(type('closeButton'), score(containsModal)),
                rule(type('closeButton'), score(containsHidden)),
                rule(type('closeButton'), score(visible)),
                rule(type('closeButton').max(), out('closeButton'))
            );
            return rules;
        }
    }
);

export default trainees;
