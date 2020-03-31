# skyux-icons
A glyph font and stylesheet for displaying SKY UX icons.

## Installation

The primary method of consuming the SKY UX icon font on the web is via the Blackbaud CDN. In the following examples, you should replace `<version>` with the specific version in this project's `package.json`. As new versions are released, previous versions will continue to be hosted on the CDN for backwards compatibility.

The URLs in the examples point to minified files. If you would like to load the non-minified file for debugging, remove the `.min` portion of the file name before the extension.

### Importing the stylesheet via HTML

`<link rel="stylesheet" href="https://sky.blackbaudcdn.net/static/skyux-icons/<version>/assets/skyux-icons.min.css">`

### Importing the stylesheet via CSS `@import`

`@import url("https://sky.blackbaudcdn.net/static/skyux-icons/<version>/assets/css/skyux-icons.min.css");`

If you are using the SKY UX icon font in a non-web-based project, you may also install it via NPM:

`npm install @skyux/icons`

If you are using SKY UX icons in a [SKY UX](https://developer.blackbaud.com/skyux/) project, the icon font will already be imported for you.

## Usage

To display an icon on an HTML page, specify an element with the CSS class `sky-i-` followed by the name of the icon. It is typical to use an `i` element for displaying icons from an icon font.

`<i class="sky-i-calendar></i>`

If you are using SKY UX, use the `sky-icon` component documented [here](https://host.nxt.blackbaud.com/skyux-indicators/docs/icon).

`<sky-icon icon="calendar" iconType="skyux"></sky-icon>`

## Contributing

The SKY UX icon font is generated using [Fontello](http://fontello.com/). To add new icons or change existing icons, follow these steps:

- Clone or fork this repo, then create a branch for your changes.

- Navigate to [fontello.com](http://fontello.com/) and drag the `config.json` file in this project's `src` folder onto Fontello's homepage. This will load the font project for editing.

- To add a new icon, drag the SVG file onto Fontello's homepage, then switch to the "Customize Names" tab and give the icon a name that follows the [kebab-case](https://medium.com/better-programming/string-case-styles-camel-pascal-snake-and-kebab-case-981407998841) convention (where each word is all lowercase and separated by a hyphen).

- To edit an existing icon, take note of the existing icon's name on the "Customize Names" tab and the character code on the "Customize Codes" tab on Fontello's homepage. Return to the "Select Icons" tab and drag the new icon's SVG file onto the page, then delete the existing icon. Change the new icon's name and character codes to the same values as the icon you are replacing. **When changing an existing icon, it is imperitave that you use the same name and character code for its replacement; otherwise you will break the icon for existing consumers!**

- When you have finished editing the icons, click the "Download webfont" button at the top of the page.

- Unzip the contents of the downloaded file and drop them in this project's `src` folder, overwriting any existing files.

- Commit your changes to your branch and push them to GitHub, then create a pull request so they can be reviewed.

- Your work is now done. The owners of this repo will handle reviewing, merging and releasing your changes.
