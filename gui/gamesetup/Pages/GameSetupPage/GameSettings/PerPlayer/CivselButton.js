PlayerSettingControls.CivselButton = class CivselButton extends GameSettingControl
{
	constructor(...args)
	{
		super(...args);

        this.civselButton = Engine.GetGUIObjectByName("civselButton[" + this.playerIndex + "]");    
        this.civselButton.tooltip = "Configure the Civilization Selection";
	}

	//onLoad()
	//{
	//	let civselPage = this.setupWindow.pages.CivselPage;
	//	this.aiConfigButton.onPress = aiConfigPage.openPage.bind(aiConfigPage, this.playerIndex);
	//}
};
