GameSettings.prototype.Attributes.DisableHeroes = class DisableHeroes extends GameSetting
{
	init()
	{
		this.setEnabled(true);
		this.settings.disableHeroes.watch(() => this.maybeUpdate(), ["enabled"]);
		this.settings.map.watch(() => this.onMapChange(), ["map"]);
	}

	toInitAttributes(attribs)
	{
		attribs.settings.DisableHeroes = this.enabled;
	}

	fromInitAttributes(attribs)
	{
		this.enabled = !!this.getLegacySetting(attribs, "DisableHeroes");
	}

	onMapChange()
	{
		this.setEnabled(!!this.getMapSetting("DisableHeroes"));
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
