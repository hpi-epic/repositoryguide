# RepositoryGuide
## https://repositorygui.de/

The RepositoryGuide application aims at helping development teams gain insights into their teamwork based on the produced GitHub project data.

RepositoryGuide uses the public [Github API](https://docs.github.com/en/rest) to extract a set of key team measures for a GitHub repository.
We envision the produced visualizations to be helpful in  Retrospective meetings, where teams can analyze and interpret their projet data of an iteration.
The focus of the included visualizations is on facilitating discussions in teams that can lead to collaborative software process improvement.

To set up a configuration for your team open the [settings tab](https://hpi-epic.github.io/repositoryguide/view/settings.html) and follow the instructions there. Then you can [edit your teams](https://hpi-epic.github.io/repositoryguide/view/team/overview.html) (stored in your own config), select your team and view the visualizations.

## Executing the tool on your own machine

1. Clone the repository: ```git@github.com:hpi-epic/repositoryguide.git``` and go into the repository folder
2. Make sure you've installed node. If not download and install it from [here](https://nodejs.org/en/download/)
3. Run `npm install` in the root of the repository
4. Generate a personal access token for GitHub using [these instructions](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token)
5. Host the project on a local server, opening `index.html` directly won't work. The WebStorm IDE offers a local development server, or run one using `python3 -m http.server`. 
6. Download the config to have an empty version of a `config.json file`. Replace ```"github_access_token": ""``` with ```"github_access_token": "<your token>"```
7. Load the edited config into the application.
8. The preparations are now done. Enjoy your metrics. :-)

## Codestyle
To follow the codestyle used in this repository you need Prettier and Eslint. After having setup the project you need to setup these tools. For Webstorm follow the following tutorials:
- ESLint
    - Follow the following steps from [this tutorial](https://www.jetbrains.com/help/webstorm/eslint.html)
        - [Before you start](https://www.jetbrains.com/help/webstorm/eslint.html#ws_js_linters_eslint_before_you_start) 1&2
        - [Configure ESLint automatically](https://www.jetbrains.com/help/webstorm/eslint.html#ws_js_eslint_automatic_configuration)
        - [Recommended to run ESLint on save](https://www.jetbrains.com/help/webstorm/eslint.html#ws_eslint_configure_run_eslint_on_save)
- Prettier
    - Follow the following steps from [this tutorial](https://www.jetbrains.com/help/webstorm/prettier.html)
        - [Before you start](https://www.jetbrains.com/help/webstorm/prettier.html#prettier_before_you_start) 1,2 and 3 
        - [Configure PRettier 2,3, & 4](https://www.jetbrains.com/help/webstorm/prettier.html#ws_prettier_install)
        - [Recommended to run Prettier on save](https://www.jetbrains.com/help/webstorm/prettier.html#ws_prettier_run_automatically_in_current_project)
