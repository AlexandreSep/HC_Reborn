export function ConquestAIBot(settings)
{
	this.player = settings.player;
	this.turn = 0;
	this.workerTemplate = undefined;
	this.resourceTypes = ["food", "wood", "stone", "metal"];
}

ConquestAIBot.prototype.Serialize = function()
{
	return {
		"turn": this.turn,
		"workerTemplate": this.workerTemplate
	};
};

ConquestAIBot.prototype.Deserialize = function(data)
{
	this.turn = data.turn || 0;
	this.workerTemplate = data.workerTemplate;
	this.resourceTypes = ["food", "wood", "stone", "metal"];
};

ConquestAIBot.prototype.setSharedState = function(playerID, sharedAI)
{
	this.player = playerID;
	this.sharedAI = sharedAI;

	if (!sharedAI || !sharedAI.gameState || !sharedAI.gameState[this.player])
	{
		this.gameState = undefined;
		if (!this.warnedMissingSharedAI)
		{
			warn("[HC_MINIMAL_AI] sharedAI unavailable; ConquestAI will stay idle until common-api loads correctly.");
			this.warnedMissingSharedAI = true;
		}
		return false;
	}

	this.gameState = sharedAI.gameState[this.player];
	return true;
};

ConquestAIBot.prototype.Init = function(state, playerID, sharedAI)
{
	this.setSharedState(playerID, sharedAI);
};

ConquestAIBot.prototype.HandleMessage = function(state, playerID, sharedAI)
{
	if (!this.setSharedState(playerID, sharedAI))
		return;

	if (++this.turn % 8)
		return;

	this.updateEconomy();
};

ConquestAIBot.prototype.updateEconomy = function()
{
	if (!this.gameState || !this.gameState.getOwnEntities)
		return;

	this.trainWorkers();
	this.assignIdleWorkers();
};

ConquestAIBot.prototype.trainWorkers = function()
{
	const facilities = this.gameState.getOwnTrainingFacilities();
	if (!facilities || !facilities.hasEntities())
		return;

	for (const facility of facilities.values())
	{
		const template = this.getWorkerTemplate(facility);
		if (!template)
			continue;

		Engine.PostCommand(this.player, {
			"type": "train",
			"entities": [facility.id()],
			"template": template,
			"count": 1
		});
		return;
	}
};

ConquestAIBot.prototype.getWorkerTemplate = function(facility)
{
	if (this.workerTemplate)
		return this.workerTemplate;

	const civ = this.gameState.getPlayerCiv ? this.gameState.getPlayerCiv() : undefined;
	const trainable = facility.trainableEntities ? facility.trainableEntities(civ) : [];
	for (const template of trainable)
		if (template && (
			template.indexOf("citizen") !== -1 ||
			template.indexOf("laborer") !== -1 ||
			template.indexOf("worker") !== -1 ||
			template.indexOf("female") !== -1))
		{
			this.workerTemplate = template;
			return template;
		}

	return trainable && trainable.length ? trainable[0] : undefined;
};

ConquestAIBot.prototype.assignIdleWorkers = function()
{
	const ownUnits = this.gameState.getOwnUnits();
	if (!ownUnits || !ownUnits.hasEntities())
		return;

	for (const unit of ownUnits.values())
	{
		if (!unit.isIdle || !unit.isIdle())
			continue;

		if (!unit.isGatherer || !unit.isGatherer())
			continue;

		const target = this.findNearestGatherableResource(unit);
		if (!target)
			continue;

		Engine.PostCommand(this.player, {
			"type": "gather",
			"entities": [unit.id()],
			"target": target.id(),
			"queued": false,
			"pushFront": false
		});
	}
};

ConquestAIBot.prototype.findNearestGatherableResource = function(unit)
{
	const pos = unit.position && unit.position();
	if (!pos)
		return undefined;

	let best;
	let bestDist = Infinity;
	for (const type of this.resourceTypes)
	{
		if (unit.canGather && !unit.canGather(type))
			continue;

		const resources = this.gameState.getResourceSupplies(type);
		if (!resources || !resources.hasEntities())
			continue;

		for (const resource of resources.values())
		{
			if (resource.isFull && resource.isFull())
				continue;

			const resourcePos = resource.position && resource.position();
			if (!resourcePos)
				continue;

			const dx = pos[0] - resourcePos[0];
			const dz = pos[1] - resourcePos[1];
			const dist = dx * dx + dz * dz;
			if (dist < bestDist)
			{
				best = resource;
				bestDist = dist;
			}
		}
	}

	return best;
};
