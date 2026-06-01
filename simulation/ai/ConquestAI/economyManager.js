import { PortedConfig, getCivConfig } from "simulation/ai/ConquestAI/portedConfig.js";
import { postGather, postTrain } from "simulation/ai/ConquestAI/commands.js";

export function EconomyManager(data)
{
	this.workerTemplate = data && data.workerTemplate;
	this.resourceCursor = data && data.resourceCursor || 0;
}

EconomyManager.prototype.Serialize = function()
{
	return {
		"workerTemplate": this.workerTemplate,
		"resourceCursor": this.resourceCursor
	};
};

EconomyManager.prototype.update = function(gameState, player, elapsedTime)
{
	if (!gameState || !gameState.getOwnEntities)
		return;

	this.trainWorkers(gameState, player);
	this.assignIdleWorkers(gameState, player, elapsedTime);
};

EconomyManager.prototype.trainWorkers = function(gameState, player)
{
	if (this.countGatherers(gameState) + this.countQueuedWorkers(gameState) >= this.getTargetWorkerCount(gameState))
		return;

	const facilities = gameState.getOwnTrainingFacilities();
	if (!facilities || !facilities.hasEntities())
		return;

	for (const facility of facilities.values())
	{
		const template = this.getWorkerTemplate(gameState, facility);
		if (!template)
			continue;

		if (this.countQueuedWorkers(gameState) >= PortedConfig.maxQueuedWorkers)
			return;

		postTrain(player, facility, template, 1);
		return;
	}
};

EconomyManager.prototype.getWorkerTemplate = function(gameState, facility)
{
	const civ = gameState.getPlayerCiv ? gameState.getPlayerCiv() : undefined;
	const trainable = facility.trainableEntities ? facility.trainableEntities(civ) : [];
	if (this.workerTemplate && trainable.indexOf(this.workerTemplate) !== -1)
		return this.workerTemplate;

	for (const keyword of PortedConfig.workerTemplateKeywords)
		for (const template of trainable)
			if (template && template.indexOf(keyword) !== -1)
			{
				this.workerTemplate = template;
				return template;
			}

	if (!facility.hasClass || (!facility.hasClass("CivCentre") && !facility.hasClass("CivilCentre")))
		return undefined;

	this.workerTemplate = trainable && trainable.length ? trainable[0] : undefined;
	return this.workerTemplate;
};

EconomyManager.prototype.isWorkerTemplateName = function(templateName)
{
	if (!templateName)
		return false;

	for (const keyword of PortedConfig.workerTemplateKeywords)
		if (templateName.indexOf(keyword) !== -1)
			return true;

	return false;
};

EconomyManager.prototype.getTargetWorkerCount = function(gameState)
{
	const civ = gameState.getPlayerCiv ? gameState.getPlayerCiv() : "default";
	const target = getCivConfig(PortedConfig, civ).citizenTargets;
	const popLimit = gameState.getPopulationLimit ? gameState.getPopulationLimit() : target.max;
	return Math.min(target.max, Math.max(target.min, Math.round(popLimit * target.ratio)));
};

EconomyManager.prototype.countGatherers = function(gameState)
{
	const ownUnits = gameState.getOwnUnits();
	if (!ownUnits || !ownUnits.hasEntities())
		return 0;

	let count = 0;
	for (const unit of ownUnits.values())
		if (unit.isGatherer && unit.isGatherer())
			++count;
	return count;
};

EconomyManager.prototype.countQueuedWorkers = function(gameState)
{
	const facilities = gameState.getOwnTrainingFacilities();
	if (!facilities || !facilities.hasEntities())
		return 0;

	let count = 0;
	for (const facility of facilities.values())
	{
		const queue = facility.trainingQueue && facility.trainingQueue();
		if (!queue)
			continue;

		for (const item of queue)
		{
			const template = item.template || item.unitTemplate || item.templateName;
			if (template && this.isWorkerTemplateName(template))
				count += item.count || 1;
		}
	}
	return count;
};

EconomyManager.prototype.assignIdleWorkers = function(gameState, player, elapsedTime)
{
	const ownUnits = gameState.getOwnUnits();
	if (!ownUnits || !ownUnits.hasEntities())
		return;

	for (const unit of ownUnits.values())
	{
		if (!unit.isIdle || !unit.isIdle())
			continue;

		if (!unit.isGatherer || !unit.isGatherer())
			continue;

		if (unit.templateName && !this.isWorkerTemplateName(unit.templateName()))
			continue;

		const target = this.findNextGatherTarget(gameState, unit, elapsedTime);
		if (!target)
			continue;

		postGather(player, unit, target);
	}
};

EconomyManager.prototype.findNextGatherTarget = function(gameState, unit, elapsedTime)
{
	const resourceTypes = this.getAllowedResourceTypes(gameState, elapsedTime);
	if (!resourceTypes.length)
		return undefined;

	for (let i = 0; i < resourceTypes.length; ++i)
	{
		const type = resourceTypes[(this.resourceCursor + i) % resourceTypes.length];
		const target = this.findNearestResourceOfType(gameState, unit, type);
		if (!target)
			continue;

		this.resourceCursor = (this.resourceCursor + i + 1) % resourceTypes.length;
		return target;
	}

	return undefined;
};

EconomyManager.prototype.getAllowedResourceTypes = function(gameState, elapsedTime)
{
	const civ = gameState.getPlayerCiv ? gameState.getPlayerCiv() : "default";
	const banned = getCivConfig(PortedConfig, civ).startStrategyBan;
	const configuredTypes = this.hasMilitaryProduction(gameState) ?
		PortedConfig.militaryEconomyResourceTypes :
		PortedConfig.resourceTypes;

	if (elapsedTime >= PortedConfig.earlyResourceBanSeconds)
		return configuredTypes.slice();

	return configuredTypes.filter(type => !banned[type]);
};

EconomyManager.prototype.hasMilitaryProduction = function(gameState)
{
	const structures = gameState.getOwnStructures && gameState.getOwnStructures();
	if (!structures || !structures.hasEntities())
		return false;

	for (const structure of structures.values())
	{
		const templateName = structure.templateName && structure.templateName();
		if (!templateName)
			continue;

		const lower = String(templateName).toLowerCase();
		if (lower.indexOf("_barracks") !== -1 ||
			lower.endsWith("/barracks") ||
			lower.indexOf("_stable") !== -1 ||
			lower.indexOf("_stables") !== -1 ||
			lower.indexOf("_mercs") !== -1)
			return true;
	}
	return false;
};

EconomyManager.prototype.findNearestResourceOfType = function(gameState, unit, type)
{
	if (unit.canGather && !unit.canGather(type))
		return undefined;

	const pos = unit.position && unit.position();
	if (!pos)
		return undefined;

	const resources = gameState.getResourceSupplies(type);
	if (!resources || !resources.hasEntities())
		return undefined;

	let best;
	let bestDist = Infinity;
	for (const resource of resources.values())
	{
		if (!this.isUsableResource(gameState, unit, resource, type))
			continue;

		const resourcePos = resource.position && resource.position();
		const dx = pos[0] - resourcePos[0];
		const dz = pos[1] - resourcePos[1];
		const dist = dx * dx + dz * dz;
		if (dist < bestDist)
		{
			best = resource;
			bestDist = dist;
		}
	}

	return best;
};

EconomyManager.prototype.isUsableResource = function(gameState, unit, resource, type)
{
	if (resource.isFull && resource.isFull())
		return false;

	const resourcePos = resource.position && resource.position();
	if (!resourcePos)
		return false;

	if (this.isEnemyTerritory(gameState, resourcePos))
		return false;

	if (!this.canUnitGatherResource(unit, resource, type))
		return false;

	return this.hasUsefulResourceAmount(resource);
};

EconomyManager.prototype.canUnitGatherResource = function(unit, resource, type)
{
	if (unit.canGather && !unit.canGather(type))
		return false;

	if (!unit.resourceGatherRates || !resource.resourceSupplyType)
		return true;

	const supplyType = resource.resourceSupplyType();
	const generic = supplyType && supplyType.generic || type;
	const specific = supplyType && supplyType.specific;
	const rates = unit.resourceGatherRates();
	return !!rates[generic] || !!rates[generic + "." + specific];
};

EconomyManager.prototype.hasUsefulResourceAmount = function(resource)
{
	const amount = resource.resourceSupplyAmount ? resource.resourceSupplyAmount() :
		resource.resourceSupplyMax ? resource.resourceSupplyMax() : 0;
	const gatherers = resource.resourceSupplyNumGatherers ? resource.resourceSupplyNumGatherers() : 0;

	return amount <= 0 || resource.resourceSupplyType && resource.resourceSupplyType().specific == "grain" ||
		amount / (1 + gatherers) >= 30;
};

EconomyManager.prototype.isEnemyTerritory = function(gameState, pos)
{
	const territoryMap = gameState.ai && gameState.ai.territoryMap;
	if (!territoryMap || !territoryMap.getOwner)
		return false;

	const owner = territoryMap.getOwner(pos);
	return owner != 0 && gameState.isPlayerEnemy && gameState.isPlayerEnemy(owner);
};
