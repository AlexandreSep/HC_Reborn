GameSettings.prototype.Attributes.AllowHeroSelectionDuringMatch = class AllowHeroSelectionDuringMatch extends GameSetting
{
	init()
	{
		this.setEnabled(false);
		this.settings.allowHeroSelectionDuringMatch.watch(() => this.maybeUpdate(), ["enabled"]);
		this.settings.map.watch(() => this.onMapChange(), ["map"]);
	}

	toInitAttributes(attribs)
	{
		attribs.settings.AllowHeroSelectionDuringMatch = this.enabled;
	}

	fromInitAttributes(attribs)
	{
		this.enabled = !!this.getLegacySetting(attribs, "AllowHeroSelectionDuringMatch");
	}

	onMapChange()
	{
		this.setEnabled(!!this.getMapSetting("AllowHeroSelectionDuringMatch"));
	}

	setEnabled(enabled)
	{
		this.enabled = (enabled);
	}

	maybeUpdate()
	{
		this.setEnabled(this.enabled);
	}
};
