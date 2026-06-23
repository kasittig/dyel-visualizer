# DYEL Visualizer

This visualizer lets you easily view trends in your lifting spreadsheet so that you can see how your strength is developing. It's specifically designed to help lifters following the [Conjugate Method](CONJUGATE.md) who frequently perform variations of the squat, bench, and deadlift, but it can be used to get some insight into any lifting log that conforms to its input format.

The visualizer can read any published Google Sheet in CSV format. It expects the following column names:

- Date (date of the workout)
- Exercise (name of the movement)
- Weight (amount lifted)
- Reps (# of times weight was lifted)
- RPE _(optional)_ — Rate of Perceived Exertion on a 1–10 scale; lets volume work contribute to e1RM estimates (without RPE the app assumes every set was taken to failure)

The visualizer assumes that all weights use the same unit (ex. lbs, kgs).

For detailed setup instructions, exercise naming rules, and a walkthrough of every chart, see [ONBOARDING.md](ONBOARDING.md).

## Using the visualizer

This application is currently deployed on my Github Pages. You can use it by going to [https://kasittig.github.io/dyel-visualizer/](https://kasittig.github.io/dyel-visualizer/).
