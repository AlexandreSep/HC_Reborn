GameSettingControls.DisableHeroes = class DisableHeroes extends GameSettingControlCheckbox
{
	constructor(...args)
	{
		super(...args);

		g_GameSettings.disableHeroes.watch(() => this.render(), ["enabled"]);
		g_GameSettings.map.watch(() => this.render(), ["type"]);
		this.render();
	}

	render()
	{
		this.setEnabled(g_GameSettings.map.type != "scenario");
		this.setChecked(g_GameSettings.disableHeroes.enabled);
	}

	onPress(checked)
	{
		g_GameSettings.disableHeroes.setEnabled(checked);
		this.gameSettingsController.setNetworkInitAttributes();
	}
};

GameSettingControls.DisableHeroes.prototype.TitleCaption =
	translate("Disable heroes");

GameSettingControls.DisableHeroes.prototype.Tooltip =
	translate("Disable heroes during the game.");
