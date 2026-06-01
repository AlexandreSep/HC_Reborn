async function init(data)
{
	Engine.GetGUIObjectByName("displaySplashScreen").checked =
		Engine.ConfigDB_GetValue("user", "gui.splashscreen.enable") === "true";

	await new Promise(resolve => {
		Engine.GetGUIObjectByName("btnOK").onPress = resolve;
	});

	Engine.ConfigDB_CreateValue("user", "gui.splashscreen.enable",
		String(Engine.GetGUIObjectByName("displaySplashScreen").checked));
	Engine.ConfigDB_CreateValue("user", "gui.splashscreen.version",
		Engine.CalculateMD5(Engine.ReadFile("gui/splashscreen/splashscreen.xml")));
	Engine.ConfigDB_SaveChanges("user");
}
