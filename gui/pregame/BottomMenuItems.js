var g_BottomMenuButtons = [
	{
		"caption": translate("HC Forum"),
		"tooltip": translate("Click to open the Hyrule Conquest Forum Thread."),
		"size": "0% 0% 20% 100%",
		"onPress": () => {
			openURL("https://wildfiregames.com/forum/index.php?/topic/22638-hyrule-conquest/");
		}
	},
	{
		"caption": translate("HC Discord"),
		"tooltip": translate("Click to open the Hyrule Conquest Discord and join the community."),
		"size": "20% 0% 40% 100%",
		"onPress": () => {
			openURL("https://discord.gg/RyzjreE");
		}
	},
	{
		"caption": translate("HC Wiki"),
		"tooltip": translate("Click to visit the Hyrule Conquest's Wiki."),
		"size": "40% 0% 60% 100%",
		"onPress": () => {
			openURL("https://hyruleconquest.wikia.com/wiki/Hyrule_Conquest_Wiki")
		}
	},
	{
		"caption": translate("Youtube"),
		"tooltip": translate("Click to visit Undyingnephalim's Youtube Channel."),
		"size": "60% 0% 80% 100%",
		"onPress": () => {
			openURL("https://www.youtube.com/UndyingNephalim");
		}
	},
	{
		"caption": translate("Credits"),
		"tooltip": translate("Show the Hyrule Conquest credits."),
		"size": "80% 0% 100% 100%",
		"onPress": () => {
			Engine.PushGuiPage("page_credits.xml");
		}
	},
];
