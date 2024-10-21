GameSettingControls.AllowHeroSelectionDuringMatch = class AllowHeroSelectionDuringMatch extends GameSettingControlCheckbox
{
	constructor(...args)
	{
		super(...args);

		g_GameSettings.allowHeroSelectionDuringMatch.watch(() => this.render(), ["enabled"]);
		g_GameSettings.disableHeroes.watch(() => this.render(), ["enabled"]);
		g_GameSettings.map.watch(() => this.render(), ["type"]);
		this.render();
	}

	render()
	{
		this.setHidden(g_GameSettings.disableHeroes.enabled);
		this.setEnabled(g_GameSettings.map.type != "scenario");
		this.setChecked(g_GameSettings.allowHeroSelectionDuringMatch.enabled);
	}

	onPress(checked)
	{
		g_GameSettings.allowHeroSelectionDuringMatch.setEnabled(checked);
		this.gameSettingsController.setNetworkInitAttributes();
	}
};

GameSettingControls.AllowHeroSelectionDuringMatch.prototype.TitleCaption =
	translate("Allow hero selection during the match");

GameSettingControls.AllowHeroSelectionDuringMatch.prototype.Tooltip =
	translate("Allow hero selection during the match.");
