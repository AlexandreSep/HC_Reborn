class SplashScreenHandler
{
	constructor(initData, hotloadData)
	{
		this.showSplashScreen = hotloadData ? hotloadData.showSplashScreen : initData && initData.isStartup;

		this.mainMenuPage = Engine.GetGUIObjectByName("mainMenuPage");
		this.mainMenuPage.onTick = this.onFirstTick.bind(this);
	}

	getHotloadData()
	{
		return {
			"showSplashScreen": this.showSplashScreen
		};
	}

	onFirstTick()
	{
		if (this.showSplashScreen)
			this.openPage();

		delete this.mainMenuPage.onTick;
	}

	openPage()
	{
		this.showSplashScreen = false;

		if (Engine.ConfigDB_GetValue("user", "gui.splashscreen.enable") === "true" ||
			Engine.ConfigDB_GetValue("user", "gui.splashscreen.version") !== Engine.CalculateMD5(Engine.ReadFile("gui/splashscreen/splashscreen.xml")))
		{
			Engine.OpenChildPage("page_splashscreen.xml", {});
		}
	}
}
