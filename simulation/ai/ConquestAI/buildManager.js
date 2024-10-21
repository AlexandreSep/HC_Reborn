var CONQUESTAI = function(m)
{

/**
 * One task of this manager is to cache the list of structures we have builders for,
 * to avoid having to loop on all entities each time.
 * It also takes care of the structures we can't currently build and should not try to build endlessly.
 */

m.BuildManager = function()
{
	// List of buildings we can't currently build (because no room, no builder or whatever),
	// with time we should wait before trying again to build it.
	this.unbuildables = new Map();
};

/** Initialization at start of game */
m.BuildManager.prototype.init = function(gameState)
{
};

/**
 * Get the first buildable structure with a given class
 * TODO when several available, choose the best one
 */
m.BuildManager.prototype.findStructureWithClass = function(gameState, classes)
{
	for (let [templateName, count] of this.builderCounters)
	{
		if (count == 0 || gameState.isTemplateDisabled(templateName))
			continue;
		let template = gameState.getTemplate(templateName);
		if (!template || !template.available(gameState))
			continue;
		if (MatchesClassList(template.classes(), classes))
			return templateName;
	}
	return undefined;
};

m.BuildManager.prototype.hasBuilder = function(template)
{
	let numBuilders = this.builderCounters.get(template);
	return numBuilders && numBuilders > 0;
};

m.BuildManager.prototype.isUnbuildable = function(gameState, template)
{
	return this.unbuildables.has(template) && this.unbuildables.get(template).time > gameState.ai.elapsedTime;
};

m.BuildManager.prototype.setBuildable = function(template)
{
	if (this.unbuildables.has(template))
		this.unbuildables.delete(template);
};

/** Time is the duration in second that we will wait before checking again if it is buildable */
m.BuildManager.prototype.setUnbuildable = function(gameState, template, time = 90, reason = "room")
{
	if (!this.unbuildables.has(template))
		this.unbuildables.set(template, { "reason": reason, "time": gameState.ai.elapsedTime + time });
	else
	{
		let unbuildable = this.unbuildables.get(template);
		if (unbuildable.time < gameState.ai.elapsedTime + time)
		{
			unbuildable.reason = reason;
			unbuildable.time = gameState.ai.elapsedTime + time;
		}
	}
};

/** Return the number of unbuildables due to missing room */
m.BuildManager.prototype.numberMissingRoom = function(gameState)
{
	let num = 0;
	for (let unbuildable of this.unbuildables.values())
		if (unbuildable.reason == "room" && unbuildable.time > gameState.ai.elapsedTime)
			++num;
	return num;
};

/** Reset the unbuildables due to missing room */
m.BuildManager.prototype.resetMissingRoom = function(gameState)
{
	for (let [key, unbuildable] of this.unbuildables)
		if (unbuildable.reason == "room")
			this.unbuildables.delete(key);
};

m.BuildManager.prototype.Serialize = function()
{
	return {
		"builderCounters": this.builderCounters,
		"unbuildables": this.unbuildables
	};
};

m.BuildManager.prototype.Deserialize = function(data)
{
	for (let key in data)
		this[key] = data[key];
};

return m;
}(CONQUESTAI);
