import {ruleset, rule, dom, type, score, out} from 'fathom-web';
import {ancestors} from 'fathom-web/utilsForFrontend';


/**
 * Rulesets to train.
 *
 * More mechanically, a map of names to {coeffs, rulesetMaker} objects.
 * rulesetMaker is a function that takes an Array of coefficients and returns a
 * ruleset that uses them. coeffs is typically the best-yet-found coefficients
 * for a ruleset but can also be some more widely flung ones that you want to
 * start the trainer from. The rulesets you specify here show up in the Train
 * UI, from which you can kick off a training run.
 */
const trainees = new Map();

trainees.set(
    // A ruleset that finds the full-screen, content-blocking overlays that
    // often go behind modal popups
    'closeButton',
    //{coeffs: [1,1,1,1,1],
    {coeffs: [1,1,1,1],

     // viewportSize: {width: 1024, height: 768},
     //
     // The content-area size to use while training. Defaults to 1024x768.

     // successFunction: (facts, traineeId) => trueOrFalse,
     //
     // By default, elements with a `data-fathom` attribute that matches the
     // trainee ID are considered a successful find for the ruleset.
     //
     // The `successFunction` property allows for alternative success
     // functions. A success function receives two arguments--a BoundRuleset
     // and the current trainee ID--and returns whether the ruleset succeeded.
     //
     // The default function for this example ruleset is essentially...
     // successFunction: facts.get('overlay')[0].element.dataset.fathom === 'overlay'

     rulesetMaker:
        // I don't think V8 is smart enough to compile this once and then sub in
        // new coeff values. I'm not sure about Spidermonkey. We may want to
        // optimize by rolling it into a class and storing coeffs explicitly in an
        // instance var. [Nope, Spidermonkey does it as efficiently as one could
        // hope, with just a {code, pointer to closure scope} pair.]

        //function ([coeffSmall, coeffSquare, coeffOnClick, coeffClassOrId, coeffVisible]) {
        function ([coeffSmall, coeffSquare, coeffClassOrId, coeffVisible]) {
            /**
             * We avoid returning full 0 from any rule, because that wipes out the tuner's
             * ability to adjust its impact by raising it to a power. .08 is big enough
             * that raising it to an annealer-accessible 1/6 power gets it up to a
             * respectable .65.
             */
            const ZEROISH = .08;
            /**
             * Likewise, .9 is low enough that raising it to 5 gets us down to .53. This is
             * a pretty arbitrary selection. I feel like ZEROISH and ONEISH should be
             * symmetric in some way, but it's not obvious to me how. If they're equal
             * distances from the extremes at ^(1/4) and ^4, for example, they won't be at
             * ^(1/5) and ^5. So I expect we'll revisit this.
             */
            const ONEISH = .9;

            /**
             * Return whether the passed-in div is the size of the whole viewport/document
             * or nearly so.
             */
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

             function onClick(fnode) {
                return ((fnode.element.hasAttribute("onclick")) ? ONEISH : ZEROISH) ** coeffOnClick;
            }

            /*
            function largeZIndex(fnode) {
                const lowerBound = 0;
                const upperBound = 1000;

                return trapezoid(fnode.element.style.zIndex, lowerBound, upperBound) ** coeffZIndex;
            } */

            function suspiciousClassOrId(fnode) {
                const element = fnode.element;
                const attributeNames = ['class', 'id', 'button'];
                let numOccurences = 0;
                function numberOfSuspiciousSubstrings(value) {
                    return 3*value.includes('close') + value.includes('modal');
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

                // 1 occurrence gets us to about 70% certainty; 2, 90%. It bottoms
                // out at ZEROISH and tops out at ONEISH.
                // TODO: Figure out how to derive the magic number .1685 from
                // ZEROISH and ONEISH.
                return (-((.3 + ZEROISH) ** (numOccurences + .1685)) + ONEISH) ** coeffClassOrId;
            }

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

            /**
             * Score hidden things real low.
             *
             * For training, this avoids false failures (and thus gives us more
             * accurate accuracy numbers) since some pages have multiple
             * popups, all but one of which are hidden in our captures.
             * However, for actual use, consider dropping this rule, since
             * deleting popups before they pop up may not be a bad thing.
             */
            function visible(fnode) {
                const element = fnode.element;
                for (const ancestor of ancestors(element)) {
                    const style = getComputedStyle(ancestor);
                    if (style.getPropertyValue('visibility') === 'hidden' ||
                        style.getPropertyValue('display') === 'none') {
                        return ZEROISH ** coeffVisible;
                    }
                    // Could add opacity and size checks here, but the
                    // "nearlyOpaque" and "big" rules already deal with opacity
                    // and size. If they don't do their jobs, maybe repeat
                    // their work here (so it gets a different coefficient).
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
                rule(dom('div'), type('closeButton')),
                // Fuzzy AND is multiplication (at least that's the definition we use,
                // since Fathom already implements it and it allows participation of
                // all anded rules.

                // I'm thinking each rule returns a confidence, 0..1, reined in by a sigmoid or trapezoid. That seems to fit the features I've collected well. I can probably make up most of those coefficients. Then we multiply the final results by a coeff each, for weighting. That will cap our total to the sum of the weights. We can then scale that sum down to 0..1 if we want, to build upon, by dividing by the product of the weights. [Actually, that weighting approach doesn't work, since the weights just get counteracted at the end. What we would need is a geometric mean-like approach, where individual rules' output is raised to a power to express its weight. Will Fathom's plain linear stuff suffice for now? If we want to keep an intuitive confidence-like meaning for each rule, we could have the coeffs be the powers each is raised to. I don't see the necessity of taking the root at the end (unless the score is being used as input to some intuitively meaningful threshold later), though we can outside the ruleset if we want. Going with a 0..1 confidence-based range means a rule can never boost a score--only add doubt--but I'm not sure that's a problem. If a rule wants to say "IHNI", it can also return 1 and thus not change the product. (Though they'll add 1 to n in the nth-root. Is that a problem?)] The optimizer will have to consider fractional coeffs so we can lighten up unduly certain rules.
                rule(type('closeButton'), score(small)),
                rule(type('closeButton'), score(square)),
                //rule(type('closeButton'), score(onClick)),
                //rule(type('closeButton'), score(zIndex)),
                rule(type('closeButton'), score(suspiciousClassOrId)),
                //rule(type('closeButton'), score(hasCloseInClassName)),
                //rule(type('closeButton'), score(hasCloseInID)),
                rule(type('closeButton'), score(visible)),
                rule(type('closeButton').max(), out('closeButton'))
            );
            return rules;
        }
    }
);

export default trainees;
