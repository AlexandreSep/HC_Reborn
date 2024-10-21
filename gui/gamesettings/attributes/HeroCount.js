GameSettings.prototype.Attributes.HeroCount = class HeroCount extends GameSetting
{
	init()
	{
		this.nbHeroes = 3;
		this.settings.map.watch(() => this.onMapChange(), ["map"]);
	}

	toInitAttributes(attribs)
	{
		attribs.settings.HeroCount = this.nbHeroes;
	}

	fromInitAttributes(attribs)
	{
		if ( !!this.getLegacySetting(attribs, "HeroCount") ){
			this.setNbHeroes(this.getLegacySetting(attribs, "HeroCount"));
		}
	}

	onMapChange()
	{
	}

	reloadFromLegacy(data)
	{
	}

	
	get(index)
	{
		return this.data[index];
	}

	setNbHeroes(nb)
	{
		this.nbHeroes = Math.max(0, Math.min(6, nb));
	}
};
