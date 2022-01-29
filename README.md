# RepositoryGuide
## https://repositorygui.de/

The RepositoryGuide application aims at helping development teams gain insights into their teamwork based on the produced GitHub project data.

RepositoryGuide uses the public [Github API](https://docs.github.com/en/rest) to extract a set of key team measures for a GitHub repository.
We envision the produced visualizations to be helpful in  Retrospective meetings, where teams can analyze and interpret their projet data of an iteration.
The focus of the included visualizations is on facilitating discussions in teams that can lead to collaborative software process improvement.

To set up a configuration for your team open the [settings tab](https://hpi-epic.github.io/repositoryguide/view/settings.html) and follow the instructions there. Then you can [edit your teams](https://hpi-epic.github.io/repositoryguide/view/team/overview.html) (stored in your own config), select your team and view the visualizations.

## Installation

1. Make sure you've installed node. If not download and install it from [here](https://nodejs.org/en/download/)
2. Clone the repository: `git@github.com:hpi-epic/repositoryguide.git` and go into the repository folder
3. Run `npm install` in the root of the repository
4. Run `npm start` to compile the scss and start a server
5. Open the home page in a browser (default address is `localhost:3000/views/home`)

## Configuration

1. Generate a personal access token for GitHub
   using [these instructions](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token)
2. On the settings page, download the config to have an empty version of a `config.json file`. Replace `"github_access_token": ""`
   with `"github_access_token": "<your token>"`
3. Load the edited config into the application.

## Codestyle

To define a codestyle, we used Prettier and Eslint. Use `npm run prettier-<check|autofix>` or `npm run eslint-<check|autofix>` to apply these rules.

Alternatively, you can set these up for your IDE. For Webstorm follow the following tutorials:

-   ESLint
    -   Follow the following steps from [this tutorial](https://www.jetbrains.com/help/webstorm/eslint.html)
        -   [Before you start](https://www.jetbrains.com/help/webstorm/eslint.html#ws_js_linters_eslint_before_you_start)
            1&2
        -   [Configure ESLint automatically](https://www.jetbrains.com/help/webstorm/eslint.html#ws_js_eslint_automatic_configuration)
        -   [Recommended to run ESLint on save](https://www.jetbrains.com/help/webstorm/eslint.html#ws_eslint_configure_run_eslint_on_save)
-   Prettier
    -   Follow the following steps from [this tutorial](https://www.jetbrains.com/help/webstorm/prettier.html)
        -   [Before you start](https://www.jetbrains.com/help/webstorm/prettier.html#prettier_before_you_start) 1,2 and 3
        -   [Configure Prettier 2,3, & 4](https://www.jetbrains.com/help/webstorm/prettier.html#ws_prettier_install)
        -   [Recommended to run Prettier on save](https://www.jetbrains.com/help/webstorm/prettier.html#ws_prettier_run_automatically_in_current_project)
