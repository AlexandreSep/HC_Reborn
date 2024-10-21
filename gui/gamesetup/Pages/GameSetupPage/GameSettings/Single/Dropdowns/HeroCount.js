GameSettingControls.HeroCount = class HeroCount extends GameSettingControlDropdown
{
	constructor(...args)
	{
		super(...args);

		this.values = [1,2,3,4,5,6]

		this.dropdown.list = this.values;
		this.dropdown.list_data = this.values;

		g_GameSettings.heroCount.watch(() => this.render(), ["nbHeroes"]);
		g_GameSettings.map.watch(() => this.render(), ["type"]);
		g_GameSettings.disableHeroes.watch(() => this.render(), ["enabled"]);
		this.render();
	}

	render()
	{
		this.setHidden(g_GameSettings.disableHeroes.enabled);
		this.setSelectedValue(g_GameSettings.heroCount.nbHeroes);
	}
	
	setEnabled(enabled)
	{
		this.available = g_GameSettings.disableHeroes.enabled;
		this.enabled = (enabled && this.available);
	}

	onSelectionChange(itemIdx)
	{
		g_GameSettings.heroCount.setNbHeroes(this.values[itemIdx]);
		this.gameSettingsController.setNetworkInitAttributes();
	}
};

GameSettingControls.HeroCount.prototype.TitleCaption =
	translate("Number of Heroes");

GameSettingControls.HeroCount.prototype.Tooltip =
	translate("Select number of heroes allowed for each player.");
