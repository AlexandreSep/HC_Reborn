/**
 * IMPORTANT: Remember to update session/top_panel/BuildLabel.xml in sync with this.
 */
var g_ProjectInformation = {
	"organizationName": {
		"caption": translate("WILDFIRE GAMES")
	},
	"organizationLogo": {
		"sprite": "WildfireGamesLogo"
	},
	"productLogo": {
		"sprite": "0ADLogo"
	},
	"productBuild": {
		"caption": getBuildString()
	},
	"productDescription": {
		"caption": setStringTags(translate("Hyrule Conquest Version 0.10"), { "font": "sans-bold-16" }) + "\n\n" +
			translate("Notice: This game is under development and many features have not been added yet.")
	}
};

var g_CommunityButtons = [
	{
		"caption": translate("HC Support"),
		"tooltip": translate("Click to open the Hyrule Conquest Support Thread."),
		"size": "8 100%-144 50%-4 100%-116",
		"onPress": () => {
			openURL("https://wildfiregames.com/forum/index.php?/topic/22638-hyrule-conquest/");
		}
	},
	{
		"caption": translate("HC Discord"),
		"tooltip": translate("Click to open the Hyrule Conquest Discord."),
		"size": "50%+4 100%-144 100%-8 100%-116",
		"onPress": () => {
			openURL("https://discord.gg/RyzjreE");
		}
	},
	{
		"caption": translate("HC Wiki"),
		"tooltip": translate("Click to visit Hyrule Conquest's Wiki."),
		"size": "8 100%-108 100%-8 100%-80",
		"onPress": () => {
			openURL("https://hyruleconquest.wikia.com/wiki/Hyrule_Conquest_Wiki")
		}
	},
	{
		"caption": translate("DeviantArt"),
		"tooltip": translate("Click to visit Undyingnephalim's Deviantart."),
		"size": "8 100%-72 100%-8 100%-44",
		"onPress": () => {
			openURL("https://undyingnephalim.deviantart.com/");
		}
	},
	{
		"caption": translate("Patreon"),
		"tooltip": translate("Click to visit Undyingnephalim's Patreon and support his work."),
		"size": "8 100%-36 100%-8 100%-8",
		"onPress": () => {
			openURL("https://www.patreon.com/undyingnephalim");
		}
	}
];
