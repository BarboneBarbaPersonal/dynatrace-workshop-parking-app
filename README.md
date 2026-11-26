# Dynatrace Workshop - Parking App

Shared workshop project: a parking app instrumented with Dynatrace.

## Operating model
1. **`Spec.md` defines the goal.** What we build and why. Changes go through a pull request.
2. **`docs/PLAN.md` is what we follow.** Update it every time something is done or changes.
3. **`mockup/` is what we improve and validate.** The working website we test with people.

## Where things live
- `Spec.md`, `docs/PLAN.md`, `mockup/` - see above.
- GitHub Issues - the task list. Assign yourself before you start a task.
- `CLAUDE.md` - rules every collaborator's Claude follows.

## Run the mockup
Live: https://barbonebarbapersonal.github.io/dynatrace-workshop-parking-app/mockup/
Design it follows: `Garage Parking App Prototype.html`.

Locally: open `mockup/index.html` in a browser, or run `python -m http.server` in the repo folder and go to
http://localhost:8000/mockup/. Data is saved in your browser only.

Demo admin account (mockup only, not real security - the site is public): name `admin`, password `parking-demo`.

Run the logic tests: `node --test` (finds every `*.test.js` file).

## How to contribute
1. Accept the collaborator invite, then clone the repo.
2. Pull the latest `main`: `git checkout main` then `git pull`.
3. Create a branch: `git checkout -b your-github-name/topic`.
4. Push it and open a pull request into `main`. Direct pushes to `main` are blocked.

## Rules
- Never commit secrets: Dynatrace tokens, tenant URLs, passwords, `.env` files.
- No customer or internal company data in this repo. It is public.
