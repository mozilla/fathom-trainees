# Fathom Trainees

This is a "sidecar" addon to FathomFox; it is where you park rulesets to be trained using [FathomFox's Trainer](https://github.com/mozilla/fathom-fox#the-trainer). Fork this repo, stick your own ruleset in it, and install it alongside [FathomFox](https://addons.mozilla.org/en-US/firefox/addon/fathomfox/) to optimize your coefficients. By keeping your rulesets in a separate addon, you avoid having to fork and keep up with FathomFox itself, and you can choose and control your own independent compilation pipeline.

## Getting Started

1. Fork this repository.
2. `git submodule update --init --recursive` to pull down the internal version of Fathom. (We're currently using a special branch of it, or we'd install it as a normal npm module.)
3. Edit `src/trainees.js`, replacing the included example ruleset with your own. Or leave the example there the first time around, just to make sure everything is working. You can add multiple rulesets if you wish.
4. Run rollup in the background to keep the compiled version of your addon up to date as you edit: `yarn run watch`.
5. In another terminal, fire up the addon in Firefox, reloading it as it changes: `yarn run browser`.
6. Install [FathomFox](https://addons.mozilla.org/en-US/firefox/addon/fathomfox/) in that instance of Firefox.
7. Open the FathomFox Trainer as documented at https://github.com/mozilla/fathom-fox#the-trainer, drag some labeled pages into the same window, and train your ruleset.

Once you've found some well-performing coefficients, replace the old ones in `src/trainees.js`, and ship your ruleset!
