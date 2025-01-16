/**
 * This is the handler that coordinates all other handlers on this GUI page.
 */
class MainMenuPage
{
	constructor(data, hotloadData, centerMenuItems, backgroundLayerData, projectInformationItems, bottomMenuButtons, topMenuLeftSide, topMenuRightSide)
	{

		this.backgroundHandler = new BackgroundHandler(pickRandom(backgroundLayerData));
		this.menuHandler = new CenterMenuItemHandler(centerMenuItems);
		this.splashScreenHandler = new SplashScreenHandler(data, hotloadData && hotloadData.splashScreenHandler);

		new MusicHandler();
		new ProjectInformationHandler(projectInformationItems);
		new bottomMenuItemHandler(bottomMenuButtons);
		new TopMenuItemHandler(topMenuLeftSide, topMenuRightSide);
	}

	getHotloadData()
	{
		return {
			"splashScreenHandler": this.splashScreenHandler.getHotloadData()
		};
	}
}

class MusicHandler
{
	constructor()
	{
		initMusic();
		global.music.setState(global.music.states.MENU);
	}
}
