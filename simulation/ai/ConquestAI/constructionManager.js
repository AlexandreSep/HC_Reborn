import { PortedConfig, getCivConfig } from "simulation/ai/ConquestAI/portedConfig.js";
import { postConstruct, postUpgrade } from "simulation/ai/ConquestAI/commands.js";
import { findBestBuildPosition } from "simulation/ai/ConquestAI/placement.js";
import {
	getTemplateAIBuild,
	getTemplateCategory,
	getTemplateClasses,
	getTemplateCost,
	getTemplateUpgrades,
	hasTemplateComponent,
	isPlotTemplate
} from "simulation/ai/ConquestAI/templateInfo.js";

export function ConstructionManager(data)
{
	this.houseTemplate = data && data.houseTemplate;
	this.dropsiteTemplate = data && data.dropsiteTemplate;
	this.fieldTemplate = data && data.fieldTemplate;
	this.militaryTemplate = data && data.militaryTemplate;
	this.supportTemplate = data && data.supportTemplate;
	this.placementCursor = data && data.placementCursor || 0;
	this.dropsitePlacementCursor = data && data.dropsitePlacementCursor || 0;
	this.fieldPlacementCursor = data && data.fieldPlacementCursor || 0;
	this.militaryPlacementCursor = data && data.militaryPlacementCursor || 0;
	this.supportPlacementCursor = data && data.supportPlacementCursor || 0;
	this.lastHouseBuildTime = data && data.lastHouseBuildTime || -Infinity;
	this.lastDropsiteBuildTime = data && data.lastDropsiteBuildTime || -Infinity;
	this.lastFieldBuildTime = data && data.lastFieldBuildTime || -Infinity;
	this.lastMilitaryBuildTime = data && data.lastMilitaryBuildTime || -Infinity;
	this.lastSupportBuildTime = data && data.lastSupportBuildTime || -Infinity;
	this.pendingDropsiteUntil = data && data.pendingDropsiteUntil || -Infinity;
	this.pendingFieldUntil = data && data.pendingFieldUntil || -Infinity;
	this.pendingMilitaryUntil = data && data.pendingMilitaryUntil || -Infinity;
	this.pendingSupportUntil = data && data.pendingSupportUntil || -Infinity;
	this.lastDropsiteDebugTime = data && data.lastDropsiteDebugTime || -Infinity;
	this.unbuildables = data && data.unbuildables || {};
	this.pendingPlotUpgrades = data && data.pendingPlotUpgrades || {};
}

ConstructionManager.prototype.Serialize = function()
{
	return {
		"houseTemplate": this.houseTemplate,
		"dropsiteTemplate": this.dropsiteTemplate,
		"fieldTemplate": this.fieldTemplate,
		"militaryTemplate": this.militaryTemplate,
		"supportTemplate": this.supportTemplate,
		"placementCursor": this.placementCursor,
		"dropsitePlacementCursor": this.dropsitePlacementCursor,
		"fieldPlacementCursor": this.fieldPlacementCursor,
		"militaryPlacementCursor": this.militaryPlacementCursor,
		"supportPlacementCursor": this.supportPlacementCursor,
		"lastHouseBuildTime": this.lastHouseBuildTime,
		"lastDropsiteBuildTime": this.lastDropsiteBuildTime,
		"lastFieldBuildTime": this.lastFieldBuildTime,
		"lastMilitaryBuildTime": this.lastMilitaryBuildTime,
		"lastSupportBuildTime": this.lastSupportBuildTime,
		"pendingDropsiteUntil": this.pendingDropsiteUntil,
		"pendingFieldUntil": this.pendingFieldUntil,
		"pendingMilitaryUntil": this.pendingMilitaryUntil,
		"pendingSupportUntil": this.pendingSupportUntil,
		"lastDropsiteDebugTime": this.lastDropsiteDebugTime,
		"unbuildables": this.unbuildables,
		"pendingPlotUpgrades": this.pendingPlotUpgrades
	};
};

ConstructionManager.prototype.update = function(gameState, player, turn, elapsedTime)
{
	if (!gameState || !gameState.getOwnEntities)
		return;

	if (turn % PortedConfig.constructionIntervalTurns)
		return;

	this.cleanupPlotUpgradeReservations(elapsedTime);

	if (!this.hasStorehouseLikeStructure(gameState) &&
		this.constructDropsiteIfNeeded(gameState, player, elapsedTime))
		return;

	if (this.constructHouseIfNeeded(gameState, player, elapsedTime))
		return;

	if (!this.countMilitaryProductionBuildings(gameState) &&
		this.constructMilitaryProductionIfNeeded(gameState, player, elapsedTime))
		return;

	if (this.constructDropsiteIfNeeded(gameState, player, elapsedTime))
		return;

	if (this.constructFieldIfNeeded(gameState, player, elapsedTime))
		return;

	if (this.constructMilitaryProductionIfNeeded(gameState, player, elapsedTime))
		return;

	this.constructSupportBuildingIfNeeded(gameState, player, elapsedTime);
};

ConstructionManager.prototype.constructHouseIfNeeded = function(gameState, player, elapsedTime)
{
	if (!this.needsHouse(gameState))
		return false;

	if (elapsedTime - this.lastHouseBuildTime < PortedConfig.houseBuildCooldownSeconds)
		return false;

	if (this.countFoundations(gameState) >= PortedConfig.maxFoundations)
		return false;

	let builder = this.getBuilder(gameState);
	if (!builder)
		return false;

	const template = this.getHouseTemplate(gameState, builder, elapsedTime);
	if (!template)
		return false;

	if (this.tryUpgradeExistingPlot(gameState, player, template, elapsedTime))
	{
		this.lastHouseBuildTime = this.getPlacementRetryTimestamp(
			elapsedTime,
			PortedConfig.houseBuildCooldownSeconds);
		return true;
	}

	if (!this.canAffordTemplate(gameState, template))
		return false;

	if (this.countTemplateFoundations(gameState, template) > 0 ||
		this.countHouseFoundations(gameState) > 0)
		return false;

	const anchor = this.getConstructionAnchor(gameState);
	if (!anchor)
		return false;

	const position = this.getPlacementNear(gameState, player, template, anchor.position());
	if (!position)
	{
		this.markTemplateUnbuildable(template, elapsedTime);
		return false;
	}

	builder = this.getBuilder(gameState, position, template) || builder;

	postConstruct(player, builder, template, position, this.angleFromAnchor(anchor.position(), position));
	this.clearTemplateUnbuildable(template);
	this.lastHouseBuildTime = this.getPlacementRetryTimestamp(
		elapsedTime,
		PortedConfig.houseBuildCooldownSeconds);
	return true;
};

ConstructionManager.prototype.constructDropsiteIfNeeded = function(gameState, player, elapsedTime)
{
	if (elapsedTime - this.lastDropsiteBuildTime < PortedConfig.dropsiteBuildCooldownSeconds)
		return false;

	if (elapsedTime < this.pendingDropsiteUntil)
		return false;

	if (this.countFoundations(gameState) >= PortedConfig.maxFoundations)
		return false;

	let builder = this.getBuilder(gameState);
	if (!builder)
		return false;

	const template = this.getDropsiteTemplate(gameState, builder, elapsedTime);
	if (!template)
		return false;

	if (this.tryUpgradeExistingPlot(gameState, player, template, elapsedTime))
	{
		this.lastDropsiteBuildTime = this.getPlacementRetryTimestamp(
			elapsedTime,
			PortedConfig.dropsiteBuildCooldownSeconds);
		this.pendingDropsiteUntil = elapsedTime + PortedConfig.dropsiteRequestPendingSeconds;
		return true;
	}

	if (!this.canAffordTemplate(gameState, template))
		return false;

	if (this.countTemplateFoundations(gameState, template) > 0 ||
		this.countDropsiteFoundations(gameState) > 0)
		return false;

	const anchor = this.getConstructionAnchor(gameState);
	if (!anchor)
		return false;

	const resource = this.findDropsiteResource(gameState, anchor.position(), elapsedTime);
	if (!resource)
		return false;

	const position = this.getDropsitePlacementNear(gameState, player, template, resource.position());
	if (!position)
	{
		this.markTemplateUnbuildable(template, elapsedTime);
		return false;
	}

	builder = this.getBuilder(gameState, position, template) || builder;

	postConstruct(player, builder, template, position, this.angleFromAnchor(resource.position(), position));
	this.clearTemplateUnbuildable(template);
	this.lastDropsiteBuildTime = this.getPlacementRetryTimestamp(
		elapsedTime,
		PortedConfig.dropsiteBuildCooldownSeconds);
	this.pendingDropsiteUntil = elapsedTime + PortedConfig.dropsiteRequestPendingSeconds;
	return true;
};

ConstructionManager.prototype.constructFieldIfNeeded = function(gameState, player, elapsedTime)
{
	if (!this.needsField(gameState))
		return false;

	if (elapsedTime - this.lastFieldBuildTime < PortedConfig.fieldBuildCooldownSeconds)
		return false;

	if (elapsedTime < this.pendingFieldUntil)
		return false;

	if (this.countFoundations(gameState) >= PortedConfig.maxFoundations)
		return false;

	if (this.countFieldFoundations(gameState) > 0)
		return false;

	let builder = this.getBuilder(gameState);
	if (!builder)
		return false;

	const template = this.getFieldTemplate(gameState, builder, elapsedTime);
	if (!template)
		return false;

	if (this.tryUpgradeExistingPlot(gameState, player, template, elapsedTime))
	{
		this.lastFieldBuildTime = this.getPlacementRetryTimestamp(
			elapsedTime,
			PortedConfig.fieldBuildCooldownSeconds);
		this.pendingFieldUntil = elapsedTime + PortedConfig.fieldRequestPendingSeconds;
		return true;
	}

	if (!this.canAffordTemplate(gameState, template))
		return false;

	const anchor = this.getFieldAnchor(gameState) || this.getConstructionAnchor(gameState);
	if (!anchor || !anchor.position || !anchor.position())
		return false;

	const position = this.getFieldPlacementNear(gameState, player, template, anchor.position());
	if (!position)
	{
		this.markTemplateUnbuildable(template, elapsedTime);
		return false;
	}

	builder = this.getBuilder(gameState, position, template) || builder;

	postConstruct(player, builder, template, position, this.angleFromAnchor(anchor.position(), position));
	this.clearTemplateUnbuildable(template);
	this.lastFieldBuildTime = this.getPlacementRetryTimestamp(
		elapsedTime,
		PortedConfig.fieldBuildCooldownSeconds);
	this.pendingFieldUntil = elapsedTime + PortedConfig.fieldRequestPendingSeconds;
	return true;
};

ConstructionManager.prototype.constructMilitaryProductionIfNeeded = function(gameState, player, elapsedTime)
{
	if (!this.needsMilitaryProduction(gameState))
		return false;

	if (elapsedTime - this.lastMilitaryBuildTime < PortedConfig.militaryBuildCooldownSeconds)
		return false;

	if (elapsedTime < this.pendingMilitaryUntil)
		return false;

	if (this.countFoundations(gameState) >= PortedConfig.maxFoundations)
		return false;

	let builder = this.getBuilder(gameState);
	if (!builder)
		return false;

	const template = this.getMilitaryProductionTemplate(gameState, builder, elapsedTime);
	if (!template)
		return false;

	if (this.tryUpgradeExistingPlot(gameState, player, template, elapsedTime))
	{
		this.lastMilitaryBuildTime = this.getPlacementRetryTimestamp(
			elapsedTime,
			PortedConfig.militaryBuildCooldownSeconds,
			PortedConfig.militaryPlacementRetrySeconds);
		this.pendingMilitaryUntil = elapsedTime + PortedConfig.militaryRequestPendingSeconds;
		return true;
	}

	if (!this.canAffordTemplate(gameState, template))
		return !this.countMilitaryProductionBuildings(gameState);

	if (this.countTemplateFoundations(gameState, template) > 0)
		return false;

	const anchor = this.getConstructionAnchor(gameState);
	if (!anchor || !anchor.position || !anchor.position())
		return false;

	const position = this.getMilitaryPlacementNear(gameState, player, template, anchor.position());
	if (!position)
	{
		this.markTemplateUnbuildable(template, elapsedTime);
		return false;
	}

	builder = this.getBuilder(gameState, position, template) || builder;

	postConstruct(player, builder, template, position, this.angleFromAnchor(anchor.position(), position));
	this.clearTemplateUnbuildable(template);
	this.lastMilitaryBuildTime = this.getPlacementRetryTimestamp(
		elapsedTime,
		PortedConfig.militaryBuildCooldownSeconds,
		PortedConfig.militaryPlacementRetrySeconds);
	this.pendingMilitaryUntil = elapsedTime + PortedConfig.militaryRequestPendingSeconds;
	return true;
};

ConstructionManager.prototype.constructSupportBuildingIfNeeded = function(gameState, player, elapsedTime)
{
	if (!this.needsSupportBuilding(gameState))
		return false;

	if (elapsedTime - this.lastSupportBuildTime < PortedConfig.supportBuildCooldownSeconds)
		return false;

	if (elapsedTime < this.pendingSupportUntil)
		return false;

	if (this.countFoundations(gameState) >= PortedConfig.maxFoundations)
		return false;

	let builder = this.getBuilder(gameState);
	if (!builder)
		return false;

	const template = this.getSupportBuildingTemplate(gameState, builder, elapsedTime);
	if (!template)
		return false;

	if (this.tryUpgradeExistingPlot(gameState, player, template, elapsedTime))
	{
		this.supportTemplate = template;
		this.lastSupportBuildTime = this.getPlacementRetryTimestamp(
			elapsedTime,
			PortedConfig.supportBuildCooldownSeconds);
		this.pendingSupportUntil = elapsedTime + PortedConfig.supportRequestPendingSeconds;
		return true;
	}

	if (!this.canAffordTemplate(gameState, template))
		return false;

	if (this.countTemplateFoundations(gameState, template) > 0)
		return false;

	const anchor = this.getConstructionAnchor(gameState);
	if (!anchor || !anchor.position || !anchor.position())
		return false;

	const position = this.getSupportPlacementNear(gameState, player, template, anchor.position());
	if (!position)
	{
		this.markTemplateUnbuildable(template, elapsedTime);
		return false;
	}

	builder = this.getBuilder(gameState, position, template) || builder;

	postConstruct(player, builder, template, position, this.angleFromAnchor(anchor.position(), position));
	this.clearTemplateUnbuildable(template);
	this.supportTemplate = template;
	this.lastSupportBuildTime = this.getPlacementRetryTimestamp(
		elapsedTime,
		PortedConfig.supportBuildCooldownSeconds);
	this.pendingSupportUntil = elapsedTime + PortedConfig.supportRequestPendingSeconds;
	return true;
};

ConstructionManager.prototype.getPlacementRetryTimestamp = function(elapsedTime, fullCooldown, retrySeconds)
{
	const retry = retrySeconds || PortedConfig.constructionPlacementRetrySeconds || 8;
	return elapsedTime - fullCooldown + retry;
};

ConstructionManager.prototype.isTemplateTemporarilyUnbuildable = function(templateName, elapsedTime)
{
	return !!templateName &&
		elapsedTime !== undefined &&
		this.unbuildables &&
		this.unbuildables[templateName] !== undefined &&
		elapsedTime < this.unbuildables[templateName];
};

ConstructionManager.prototype.markTemplateUnbuildable = function(templateName, elapsedTime)
{
	if (!templateName || elapsedTime === undefined)
		return;

	this.unbuildables[templateName] = elapsedTime + (PortedConfig.unbuildableRetrySeconds || 45);
};

ConstructionManager.prototype.clearTemplateUnbuildable = function(templateName)
{
	if (templateName && this.unbuildables)
		delete this.unbuildables[templateName];
};

ConstructionManager.prototype.cleanupPlotUpgradeReservations = function(elapsedTime)
{
	if (!this.pendingPlotUpgrades)
		this.pendingPlotUpgrades = {};

	for (const id in this.pendingPlotUpgrades)
		if (elapsedTime >= this.pendingPlotUpgrades[id].until)
			delete this.pendingPlotUpgrades[id];
};

ConstructionManager.prototype.reservePlotUpgrade = function(plot, templateName, elapsedTime)
{
	if (!plot || !plot.id)
		return;

	this.pendingPlotUpgrades[plot.id()] = {
		"template": templateName,
		"until": elapsedTime + (PortedConfig.plotUpgradePendingSeconds || 45)
	};
};

ConstructionManager.prototype.isPlotReserved = function(plot, elapsedTime)
{
	if (!plot || !plot.id || !this.pendingPlotUpgrades)
		return false;

	const reservation = this.pendingPlotUpgrades[plot.id()];
	return !!reservation && elapsedTime < reservation.until;
};

ConstructionManager.prototype.hasPendingPlotUpgrade = function(templateName, elapsedTime)
{
	if (!this.pendingPlotUpgrades)
		return false;

	for (const id in this.pendingPlotUpgrades)
	{
		const reservation = this.pendingPlotUpgrades[id];
		if (reservation.template == templateName && elapsedTime < reservation.until)
			return true;
	}
	return false;
};

ConstructionManager.prototype.canAffordCosts = function(gameState, costs)
{
	if (!costs)
		return true;

	const resources = gameState.getResources && gameState.getResources();
	if (!resources)
		return false;

	for (const resource in costs)
		if ((resources[resource] || 0) < costs[resource])
			return false;
	return true;
};

ConstructionManager.prototype.tryUpgradeExistingPlot = function(gameState, player, templateName, elapsedTime)
{
	if (!templateName || this.hasPendingPlotUpgrade(templateName, elapsedTime))
		return false;

	const match = this.findPlotUpgradeForTemplate(gameState, templateName, elapsedTime);
	if (!match)
		return false;

	if (!this.canAffordCosts(gameState, match.upgrade.cost))
		return false;

	postUpgrade(player, match.plot, templateName);
	this.reservePlotUpgrade(match.plot, templateName, elapsedTime);
	this.clearTemplateUnbuildable(templateName);
	return true;
};

ConstructionManager.prototype.findPlotUpgradeForTemplate = function(gameState, templateName, elapsedTime)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return undefined;

	for (const plot of entities.values())
	{
		if (!plot.templateName || this.isPlotReserved(plot, elapsedTime))
			continue;

		if (plot.foundationProgress && plot.foundationProgress() !== undefined)
			continue;

		if (this.isEntityUpgrading(plot))
			continue;

		const plotTemplate = plot.templateName();
		if (!isPlotTemplate(gameState, plotTemplate))
			continue;

		for (const upgrade of getTemplateUpgrades(gameState, plotTemplate))
			if (upgrade.template == templateName)
				return { "plot": plot, "upgrade": upgrade };
	}
	return undefined;
};

ConstructionManager.prototype.isEntityUpgrading = function(ent)
{
	return !!ent &&
		ent._entity &&
		ent._entity.upgradeTime !== undefined &&
		ent._entity.upgradeTime > 0;
};

ConstructionManager.prototype.findUpgradeableTemplate = function(gameState, elapsedTime, predicate, scorer)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return undefined;

	let best;
	let bestScore = Infinity;
	for (const plot of entities.values())
	{
		if (!plot.templateName || this.isPlotReserved(plot, elapsedTime) || this.isEntityUpgrading(plot))
			continue;

		const plotTemplate = plot.templateName();
		if (!isPlotTemplate(gameState, plotTemplate))
			continue;

		for (const upgrade of getTemplateUpgrades(gameState, plotTemplate))
		{
			const template = upgrade.template;
			if (this.isTemplateTemporarilyUnbuildable(template, elapsedTime) ||
				!predicate.call(this, gameState, template) ||
				!this.canAIBuildTemplate(gameState, template))
				continue;

			const score = scorer ? scorer.call(this, gameState, template) : 0;
			if (score < bestScore)
			{
				best = template;
				bestScore = score;
			}
		}
	}
	return best;
};

ConstructionManager.prototype.canAffordTemplate = function(gameState, templateName)
{
	const costs = this.getTemplateCosts(gameState, templateName);
	if (!costs)
		return true;

	const resources = gameState.getResources && gameState.getResources();
	if (!resources)
		return true;

	if (resources.canAfford && typeof API3 != "undefined" && API3.Resources)
		return resources.canAfford(new API3.Resources(costs));

	for (const resource in costs)
		if ((resources[resource] || 0) < costs[resource])
			return false;

	return true;
};

ConstructionManager.prototype.getTemplateCosts = function(gameState, templateName)
{
	return getTemplateCost(gameState, templateName);
};

ConstructionManager.prototype.needsHouse = function(gameState)
{
	const houses = this.countHouses(gameState) + this.countHouseFoundations(gameState);
	if (houses < PortedConfig.houseMinCount)
		return true;

	if (!gameState.getPopulation || !gameState.getPopulationLimit)
		return false;

	const limit = gameState.getPopulationLimit();
	const pop = gameState.getPopulation();
	const max = gameState.getPopulationMax ? gameState.getPopulationMax() : limit + 1;
	const pendingLimit = limit + this.countHouseFoundations(gameState) * PortedConfig.housePendingPopulationBonus;
	return pendingLimit < max && pendingLimit - pop <= PortedConfig.housePopBuffer;
};

ConstructionManager.prototype.needsField = function(gameState)
{
	const civ = gameState.getPlayerCiv ? gameState.getPlayerCiv() : "default";
	const fieldTargets = getCivConfig(PortedConfig, civ).fieldTargets;
	const fields = this.countFields(gameState);
	const pop = gameState.getPopulation ? gameState.getPopulation() : 0;
	const desired = Math.min(
		fieldTargets.max,
		Math.max(
			fieldTargets.min,
			Math.ceil(pop / fieldTargets.populationDivisor)));
	return fields < desired;
};

ConstructionManager.prototype.needsMilitaryProduction = function(gameState)
{
	if (!this.hasStorehouseLikeStructure(gameState))
		return false;

	const pop = gameState.getPopulation ? gameState.getPopulation() : 0;
	if (pop < PortedConfig.militaryMinPopulation)
		return false;

	if (!this.countStableProductionBuildings(gameState) &&
		pop >= (PortedConfig.militaryStableMinPopulation || 35) &&
		this.countMilitaryProductionBuildings(gameState) < PortedConfig.militaryMaxProductionBuildings)
		return true;

	const desired = Math.min(
		PortedConfig.militaryMaxProductionBuildings,
		Math.max(1, Math.floor(pop / PortedConfig.militaryPopulationDivisor) + 1));
	return this.countMilitaryProductionBuildings(gameState) < desired;
};

ConstructionManager.prototype.needsSupportBuilding = function(gameState)
{
	if (this.needsMilitaryProduction(gameState))
		return false;

	if (this.countMilitaryProductionBuildings(gameState) < (PortedConfig.supportMinMilitaryProductionBuildings || 2))
		return false;

	const pop = gameState.getPopulation ? gameState.getPopulation() : 0;
	if (pop < PortedConfig.supportMinPopulation)
		return false;

	if (PortedConfig.supportRequireTownPhase && !this.hasReachedTownPhase(gameState))
		return false;

	return this.countSupportBuildings(gameState) < PortedConfig.supportMaxBuildings;
};

ConstructionManager.prototype.hasReachedTownPhase = function(gameState)
{
	if (gameState.currentPhase && gameState.currentPhase() >= 2)
		return true;

	if (!gameState.isResearched)
		return false;

	return gameState.isResearched("phase_town") ||
		gameState.isResearched("phase_town_generic");
};

ConstructionManager.prototype.countFoundations = function(gameState)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return 0;

	let count = 0;
	for (const ent of entities.values())
		if (ent.foundationProgress && ent.foundationProgress() !== undefined)
			++count;
	return count;
};

ConstructionManager.prototype.countTemplateFoundations = function(gameState, template)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return 0;

	let count = 0;
	const foundationTemplate = "foundation|" + template;
	for (const ent of entities.values())
		if (ent.templateName && ent.templateName() == foundationTemplate)
			++count;
	return count;
};

ConstructionManager.prototype.countDropsiteFoundations = function(gameState)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return 0;

	let count = 0;
	for (const ent of entities.values())
	{
		if (!ent.foundationProgress || ent.foundationProgress() === undefined || !ent.templateName)
			continue;

		if (this.isStorehouseLikeTemplate(gameState, ent.templateName()))
			++count;
	}
	return count;
};

ConstructionManager.prototype.countHouseFoundations = function(gameState)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return 0;

	let count = 0;
	for (const ent of entities.values())
	{
		if (!ent.foundationProgress || ent.foundationProgress() === undefined || !ent.templateName)
			continue;

		if (this.isHouseLikeTemplate(gameState, ent.templateName()))
			++count;
	}
	return count;
};

ConstructionManager.prototype.countHouses = function(gameState)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return 0;

	let count = 0;
	for (const ent of entities.values())
	{
		if (ent.foundationProgress && ent.foundationProgress() !== undefined)
			continue;

		if (ent.templateName && this.isHouseLikeTemplate(gameState, ent.templateName()))
			++count;
	}
	return count;
};

ConstructionManager.prototype.countFields = function(gameState)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return 0;

	let count = 0;
	for (const ent of entities.values())
		if (ent.templateName && this.isFieldLikeTemplate(gameState, ent.templateName()))
			++count;
	return count;
};

ConstructionManager.prototype.countFieldFoundations = function(gameState)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return 0;

	let count = 0;
	for (const ent of entities.values())
	{
		if (!ent.foundationProgress || ent.foundationProgress() === undefined || !ent.templateName)
			continue;

		if (this.isFieldLikeTemplate(gameState, ent.templateName()))
			++count;
	}
	return count;
};

ConstructionManager.prototype.countMilitaryProductionBuildings = function(gameState)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return 0;

	let count = 0;
	for (const ent of entities.values())
		if (ent.templateName && this.isMilitaryProductionLikeTemplate(gameState, ent.templateName()))
			++count;
	return count;
};

ConstructionManager.prototype.countSupportBuildings = function(gameState)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return 0;

	let count = 0;
	for (const ent of entities.values())
		if (ent.templateName && this.isSupportBuildingTemplate(gameState, ent.templateName()))
			++count;
	return count;
};

ConstructionManager.prototype.countStableProductionBuildings = function(gameState)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return 0;

	let count = 0;
	for (const ent of entities.values())
		if (ent.templateName && this.isStableProductionTemplate(ent.templateName()))
			++count;
	return count;
};

ConstructionManager.prototype.countBarracksProductionBuildings = function(gameState)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return 0;

	let count = 0;
	for (const ent of entities.values())
		if (ent.templateName && this.isBarracksProductionTemplate(ent.templateName()))
			++count;
	return count;
};

ConstructionManager.prototype.getBuilder = function(gameState, targetPos, template)
{
	const units = gameState.getOwnUnits();
	if (!units || !units.hasEntities())
		return undefined;

	let best;
	let bestScore = Infinity;
	for (const unit of units.values())
	{
		if (!this.canUseBuilder(gameState, unit, template))
			continue;

		const pos = unit.position && unit.position();
		if (!pos)
			continue;

		const score = this.getBuilderScore(unit, pos, targetPos);
		if (score < bestScore)
		{
			best = unit;
			bestScore = score;
		}
	}
	return best;
};

ConstructionManager.prototype.canUseBuilder = function(gameState, unit, template)
{
	if (!unit.isBuilder || !unit.isBuilder())
		return false;

	if (this.isBuilderAlreadyConstructing(unit))
		return false;

	if (!template)
		return true;

	const civ = gameState.getPlayerCiv ? gameState.getPlayerCiv() : undefined;
	const buildable = unit.buildableEntities ? unit.buildableEntities(civ) : [];
	return buildable.indexOf(template) !== -1;
};

ConstructionManager.prototype.isBuilderAlreadyConstructing = function(unit)
{
	const state = unit.unitAIState ? String(unit.unitAIState() || "") : "";
	return state.indexOf("REPAIR") !== -1 ||
		state.indexOf("BUILD") !== -1 ||
		state.indexOf("CONSTRUCT") !== -1;
};

ConstructionManager.prototype.getBuilderScore = function(unit, pos, targetPos)
{
	let score = 0;
	const target = this.getPositionArray(targetPos);
	if (target)
		score += this.distanceSquared(pos, target);

	const state = unit.unitAIState ? String(unit.unitAIState() || "") : "";
	if (unit.isIdle && unit.isIdle())
		return score;

	if (state.indexOf("GATHER") !== -1 || state.indexOf("RETURNRESOURCE") !== -1)
		return score + 10000;

	return score + 100000;
};

ConstructionManager.prototype.getPositionArray = function(position)
{
	if (!position)
		return undefined;

	if (Array.isArray(position))
		return position;

	if (position.x !== undefined && position.z !== undefined)
		return [position.x, position.z];

	return undefined;
};

ConstructionManager.prototype.getHouseTemplate = function(gameState, builder, elapsedTime)
{
	const civ = gameState.getPlayerCiv ? gameState.getPlayerCiv() : undefined;
	const buildable = builder.buildableEntities ? builder.buildableEntities(civ) : [];

	if (this.houseTemplate &&
		buildable.indexOf(this.houseTemplate) !== -1 &&
		!this.isTemplateTemporarilyUnbuildable(this.houseTemplate, elapsedTime) &&
		this.canAIBuildTemplate(gameState, this.houseTemplate))
		return this.houseTemplate;

	for (const template of buildable)
		if (!this.isTemplateTemporarilyUnbuildable(template, elapsedTime) &&
			this.isHouseTemplate(gameState, template) &&
			this.canAIBuildTemplate(gameState, template))
		{
			this.houseTemplate = template;
			return template;
		}

	const upgradeable = this.findUpgradeableTemplate(gameState, elapsedTime, this.isHouseTemplate);
	if (upgradeable)
	{
		this.houseTemplate = upgradeable;
		return upgradeable;
	}

	return undefined;
};

ConstructionManager.prototype.getDropsiteTemplate = function(gameState, builder, elapsedTime)
{
	const civ = gameState.getPlayerCiv ? gameState.getPlayerCiv() : undefined;
	const buildable = builder.buildableEntities ? builder.buildableEntities(civ) : [];

	if (this.dropsiteTemplate &&
		buildable.indexOf(this.dropsiteTemplate) !== -1 &&
		!this.isTemplateTemporarilyUnbuildable(this.dropsiteTemplate, elapsedTime) &&
		this.canAIBuildTemplate(gameState, this.dropsiteTemplate))
		return this.dropsiteTemplate;

	for (const template of buildable)
		if (!this.isTemplateTemporarilyUnbuildable(template, elapsedTime) &&
			this.isStorehouseTemplate(gameState, template) &&
			this.canAIBuildTemplate(gameState, template))
		{
			this.dropsiteTemplate = template;
			return template;
		}

	const upgradeable = this.findUpgradeableTemplate(gameState, elapsedTime, this.isStorehouseTemplate);
	if (upgradeable)
	{
		this.dropsiteTemplate = upgradeable;
		return upgradeable;
	}

	return undefined;
};

ConstructionManager.prototype.getFieldTemplate = function(gameState, builder, elapsedTime)
{
	const civ = gameState.getPlayerCiv ? gameState.getPlayerCiv() : undefined;
	const buildable = builder.buildableEntities ? builder.buildableEntities(civ) : [];

	if (this.fieldTemplate &&
		buildable.indexOf(this.fieldTemplate) !== -1 &&
		!this.isTemplateTemporarilyUnbuildable(this.fieldTemplate, elapsedTime) &&
		this.canAIBuildTemplate(gameState, this.fieldTemplate))
		return this.fieldTemplate;

	for (const template of buildable)
		if (!this.isTemplateTemporarilyUnbuildable(template, elapsedTime) &&
			this.isFieldTemplate(gameState, template) &&
			this.canAIBuildTemplate(gameState, template))
		{
			this.fieldTemplate = template;
			return template;
		}

	const upgradeable = this.findUpgradeableTemplate(gameState, elapsedTime, this.isFieldTemplate);
	if (upgradeable)
	{
		this.fieldTemplate = upgradeable;
		return upgradeable;
	}

	return undefined;
};

ConstructionManager.prototype.getMilitaryProductionTemplate = function(gameState, builder, elapsedTime)
{
	const civ = gameState.getPlayerCiv ? gameState.getPlayerCiv() : undefined;
	const buildable = builder.buildableEntities ? builder.buildableEntities(civ) : [];

	let best;
	let bestScore = Infinity;
	for (const template of buildable)
	{
		if (this.isTemplateTemporarilyUnbuildable(template, elapsedTime) ||
			!this.isMilitaryProductionTemplate(gameState, template) ||
			!this.canAIBuildTemplate(gameState, template))
			continue;

		const score = this.getMilitaryProductionTemplateScore(gameState, template);
		if (score < bestScore)
		{
			best = template;
			bestScore = score;
		}
	}

	const upgradeable = this.findUpgradeableTemplate(
		gameState,
		elapsedTime,
		this.isMilitaryProductionTemplate,
		this.getMilitaryProductionTemplateScore);
	if (upgradeable)
	{
		const score = this.getMilitaryProductionTemplateScore(gameState, upgradeable);
		if (score < bestScore)
		{
			best = upgradeable;
			bestScore = score;
		}
	}

	this.militaryTemplate = best;
	return best;
};

ConstructionManager.prototype.getSupportBuildingTemplate = function(gameState, builder, elapsedTime)
{
	const civ = gameState.getPlayerCiv ? gameState.getPlayerCiv() : undefined;
	const buildable = builder.buildableEntities ? builder.buildableEntities(civ) : [];

	let best;
	let bestScore = Infinity;
	for (const template of buildable)
	{
		if (this.isTemplateTemporarilyUnbuildable(template, elapsedTime) ||
			!this.isSupportBuildingTemplate(gameState, template) ||
			!this.canAIBuildTemplate(gameState, template) ||
			this.countTemplateCopies(gameState, template) > 0)
			continue;

		const score = this.getSupportBuildingTemplateScore(gameState, template);
		if (score < bestScore)
		{
			best = template;
			bestScore = score;
		}
	}

	const upgradeable = this.findUpgradeableTemplate(
		gameState,
		elapsedTime,
		this.isSupportBuildingTemplate,
		this.getSupportBuildingTemplateScore);
	if (upgradeable)
	{
		const score = this.getSupportBuildingTemplateScore(gameState, upgradeable);
		if (score < bestScore)
		{
			best = upgradeable;
			bestScore = score;
		}
	}

	this.supportTemplate = best;
	return best;
};

ConstructionManager.prototype.getMilitaryProductionTemplateScore = function(gameState, templateName)
{
	const lower = String(templateName || "").toLowerCase();
	let score = 100;

	if (lower.indexOf("barracks") !== -1 || lower.indexOf("barrack") !== -1)
		score -= 80;
	if (lower.indexOf("hub_barracks") !== -1 || lower.indexOf("dormitory") !== -1)
		score -= 70;
	if (lower.indexOf("stables") !== -1 || lower.indexOf("stable") !== -1)
		score -= 30;
	if (lower.indexOf("merc") !== -1)
		score += 20;
	if (lower.indexOf("blacksmith") !== -1 ||
		lower.indexOf("library") !== -1 ||
		lower.indexOf("hospital") !== -1 ||
		lower.indexOf("temple") !== -1 ||
		lower.indexOf("siege") !== -1)
		score += 40;

	const aiBuild = getTemplateAIBuild(gameState, templateName);
	if (aiBuild && aiBuild.minPop !== undefined)
		score += aiBuild.minPop;

	if (this.countMilitaryProductionBuildings(gameState) > 0 &&
		this.isStableProductionTemplate(templateName) &&
		!this.countStableProductionBuildings(gameState))
		score -= 140;

	if (this.isStableProductionTemplate(templateName))
		score += this.countStableProductionBuildings(gameState) * 80;
	else if (this.isBarracksProductionTemplate(templateName))
		score += this.countBarracksProductionBuildings(gameState) * 80;
	else
		score += this.countTemplateCopies(gameState, templateName) * 80;

	return score;
};

ConstructionManager.prototype.getSupportBuildingTemplateScore = function(gameState, templateName)
{
	const lower = String(templateName || "").toLowerCase();
	let score = 100;

	if (lower.indexOf("blacksmith") !== -1 ||
		lower.indexOf("forge") !== -1 ||
		lower.indexOf("armorum") !== -1)
		score -= 80;
	else if (lower.indexOf("market") !== -1)
		score -= 55;
	else if (lower.indexOf("temple") !== -1 ||
		lower.indexOf("hospital") !== -1 ||
		lower.indexOf("apotheon") !== -1)
		score -= 40;
	else if (lower.indexOf("merc") !== -1)
		score -= 35;
	else if (lower.indexOf("siege") !== -1)
		score -= 20;

	if (hasTemplateComponent(gameState, templateName, "Researcher"))
		score -= 15;
	if (hasTemplateComponent(gameState, templateName, "Trainer"))
		score -= 5;

	const aiBuild = getTemplateAIBuild(gameState, templateName);
	if (aiBuild && aiBuild.minPop !== undefined)
		score += aiBuild.minPop;

	return score;
};

ConstructionManager.prototype.isStableProductionTemplate = function(templateName)
{
	const lower = String(templateName || "").toLowerCase();
	return lower.indexOf("_stable") !== -1 ||
		lower.endsWith("/stable") ||
		lower.indexOf("/stable_") !== -1 ||
		lower.indexOf("_stables") !== -1 ||
		lower.endsWith("/stables") ||
		lower.indexOf("/stables_") !== -1;
};

ConstructionManager.prototype.isBarracksProductionTemplate = function(templateName)
{
	const lower = String(templateName || "").toLowerCase();
	return lower.indexOf("_barracks") !== -1 ||
		lower.endsWith("/barracks") ||
		lower.indexOf("/barracks_") !== -1 ||
		lower.indexOf("_barrack") !== -1 ||
		lower.endsWith("/barrack") ||
		lower.indexOf("/barrack_") !== -1 ||
		lower.indexOf("hub_barracks") !== -1 ||
		lower.indexOf("dormitory") !== -1;
};

ConstructionManager.prototype.isHouseTemplate = function(gameState, templateName)
{
	if (!templateName || templateName.indexOf("foundation|") === 0)
		return false;

	const category = getTemplateCategory(gameState, templateName);
	if (category == "House")
		return true;

	return templateName.indexOf("_house") !== -1 ||
		templateName.endsWith("/house") ||
		templateName.indexOf("/house_") !== -1;
};

ConstructionManager.prototype.isHouseLikeTemplate = function(gameState, templateName)
{
	if (!templateName)
		return false;

	const cleanName = templateName.indexOf("foundation|") === 0 ?
		templateName.substring("foundation|".length) :
		templateName;

	return this.isHouseTemplate(gameState, cleanName);
};

ConstructionManager.prototype.isStorehouseTemplate = function(gameState, templateName)
{
	if (!templateName || templateName.indexOf("foundation|") === 0)
		return false;

	const category = getTemplateCategory(gameState, templateName);
	if (category == "Storehouse")
		return true;

	return templateName.indexOf("_storehouse") !== -1 ||
		templateName.endsWith("/storehouse") ||
		templateName.indexOf("/storehouse_") !== -1 ||
		templateName.indexOf("_lumbermill") !== -1 ||
		templateName.endsWith("/lumbermill") ||
		templateName.indexOf("/lumbermill_") !== -1;
};

ConstructionManager.prototype.isStorehouseLikeTemplate = function(gameState, templateName)
{
	if (!templateName)
		return false;

	const cleanName = templateName.indexOf("foundation|") === 0 ?
		templateName.substring("foundation|".length) :
		templateName;

	return this.isStorehouseTemplate(gameState, cleanName);
};

ConstructionManager.prototype.isFieldTemplate = function(gameState, templateName)
{
	if (!templateName || templateName.indexOf("foundation|") === 0)
		return false;

	const category = getTemplateCategory(gameState, templateName);
	if (category == "Field" || category == "Farmstead")
		return true;

	return templateName.indexOf("_field") !== -1 ||
		templateName.endsWith("/field") ||
		templateName.indexOf("/field_") !== -1 ||
		templateName.indexOf("_farmstead") !== -1 ||
		templateName.endsWith("/farmstead") ||
		templateName.indexOf("/farmstead_") !== -1;
};

ConstructionManager.prototype.isFieldLikeTemplate = function(gameState, templateName)
{
	if (!templateName)
		return false;

	const cleanName = templateName.indexOf("foundation|") === 0 ?
		templateName.substring("foundation|".length) :
		templateName;

	return this.isFieldTemplate(gameState, cleanName);
};

ConstructionManager.prototype.isMilitaryProductionTemplate = function(gameState, templateName)
{
	if (!templateName || templateName.indexOf("foundation|") === 0)
		return false;

	const category = getTemplateCategory(gameState, templateName);
	if (category == "Barracks")
		return true;

	return templateName.indexOf("_barracks") !== -1 ||
		templateName.endsWith("/barracks") ||
		templateName.indexOf("/barracks_") !== -1 ||
		templateName.indexOf("_stable") !== -1 ||
		templateName.endsWith("/stable") ||
		templateName.indexOf("/stable_") !== -1 ||
		templateName.indexOf("_stables") !== -1 ||
		templateName.endsWith("/stables") ||
		templateName.indexOf("/stables_") !== -1 ||
		templateName.indexOf("_mercs") !== -1 ||
		templateName.endsWith("/mercs") ||
		templateName.indexOf("/mercs_") !== -1;
};

ConstructionManager.prototype.isSupportBuildingTemplate = function(gameState, templateName)
{
	if (!templateName || templateName.indexOf("foundation|") === 0)
		return false;

	if (this.isHouseTemplate(gameState, templateName) ||
		this.isStorehouseTemplate(gameState, templateName) ||
		this.isFieldTemplate(gameState, templateName) ||
		this.isExcludedStrategicTemplate(gameState, templateName))
		return false;

	if (!hasTemplateComponent(gameState, templateName, "Researcher") &&
		!hasTemplateComponent(gameState, templateName, "Trainer"))
		return false;

	const lower = String(templateName || "").toLowerCase();
	if (lower.indexOf("civil_centre") !== -1 ||
		lower.indexOf("civilcentre") !== -1 ||
		lower.indexOf("_cc_") !== -1 ||
		lower.endsWith("/dock") ||
		lower.indexOf("_dock") !== -1)
		return false;

	return true;
};

ConstructionManager.prototype.isExcludedStrategicTemplate = function(gameState, templateName)
{
	const lower = String(templateName || "").toLowerCase();
	if (lower.indexOf("wonder") !== -1 ||
		lower.indexOf("fortress") !== -1 ||
		lower.indexOf("tower") !== -1 ||
		lower.indexOf("wall") !== -1 ||
		lower.indexOf("gate") !== -1 ||
		lower.indexOf("palisade") !== -1 ||
		lower.indexOf("sentry") !== -1)
		return true;

	const category = getTemplateCategory(gameState, templateName);
	if (category == "Wonder" ||
		category == "Fortress" ||
		category == "DefenseTower" ||
		category == "Wall" ||
		category == "Gate")
		return true;

	const classes = getTemplateClasses(gameState, templateName);
	for (const className of classes)
		if (className == "Wonder" ||
			className == "Fortress" ||
			className == "Tower" ||
			className == "Wall" ||
			className == "Gate")
			return true;

	return false;
};

ConstructionManager.prototype.isMilitaryProductionLikeTemplate = function(gameState, templateName)
{
	if (!templateName)
		return false;

	const cleanName = templateName.indexOf("foundation|") === 0 ?
		templateName.substring("foundation|".length) :
		templateName;

	return this.isMilitaryProductionTemplate(gameState, cleanName);
};

ConstructionManager.prototype.canAIBuildTemplate = function(gameState, templateName)
{
	const aiBuild = getTemplateAIBuild(gameState, templateName);
	if (!aiBuild)
		return true;

	if (aiBuild.minPop !== undefined && gameState.getPopulation && gameState.getPopulation() < aiBuild.minPop)
		return false;

	if (aiBuild.maxCopies === undefined)
		return true;

	if (aiBuild.maxCopies <= 0)
		return false;

	return this.countTemplateCopies(gameState, templateName) < aiBuild.maxCopies;
};

ConstructionManager.prototype.countTemplateCopies = function(gameState, templateName)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return 0;

	let count = 0;
	const foundationTemplate = "foundation|" + templateName;
	for (const ent of entities.values())
	{
		if (!ent.templateName)
			continue;

		const entTemplate = ent.templateName();
		if (entTemplate == templateName || entTemplate == foundationTemplate)
			++count;
	}
	return count;
};

ConstructionManager.prototype.findDropsiteResource = function(gameState, anchorPos, elapsedTime)
{
	let best;
	let bestScore = Infinity;
	let seen = 0;
	let closeEnough = 0;
	let largeEnough = 0;
	let blockedByDropsite = 0;
	for (const type of PortedConfig.resourceTypes)
	{
		const resources = gameState.getResourceSupplies(type);
		if (!resources || !resources.hasEntities())
			continue;

		for (const resource of resources.values())
		{
			++seen;
			const pos = resource.position && resource.position();
			if (!pos)
				continue;

			const maxAnchorRange = this.getDropsiteMaxAnchorRange(type);
			if (this.distanceSquared(pos, anchorPos) > maxAnchorRange * maxAnchorRange)
				continue;
			++closeEnough;

			const clusterSupply = this.getNearbySupplyAmount(resources, pos, type);
			if (clusterSupply < this.getDropsiteMinResourceAmount(type))
				continue;
			++largeEnough;

			if (this.hasNearbyDropsite(gameState, type, pos))
			{
				++blockedByDropsite;
				continue;
			}

			if (this.hasNearbyStorehouseLikeDropsite(gameState, pos))
			{
				++blockedByDropsite;
				continue;
			}

			const score = this.distanceSquared(pos, anchorPos) - clusterSupply + this.getDropsiteTypePriority(type);
			if (score < bestScore)
			{
				best = resource;
				bestScore = score;
			}
		}
	}

	if (!best && elapsedTime - this.lastDropsiteDebugTime >= PortedConfig.dropsiteDebugIntervalSeconds)
	{
		this.lastDropsiteDebugTime = elapsedTime;
		warn("[HC_DEBUG_AI] no dropsite target seen=" + seen +
			" close=" + closeEnough +
			" large=" + largeEnough +
			" blockedByDropsite=" + blockedByDropsite);
	}

	return best;
};

ConstructionManager.prototype.getNearbySupplyAmount = function(resources, pos, resourceType)
{
	const range = this.getDropsiteClusterRange(resourceType);
	const maxDist = range * range;
	let amount = 0;
	for (const resource of resources.values())
	{
		const otherPos = resource.position && resource.position();
		if (!otherPos || this.distanceSquared(pos, otherPos) > maxDist)
			continue;

		amount += resource.resourceSupplyMax ? resource.resourceSupplyMax() : 0;
	}
	return amount;
};

ConstructionManager.prototype.getDropsiteMinResourceAmount = function(resourceType)
{
	const amounts = PortedConfig.dropsiteMinResourceAmounts || {};
	return amounts[resourceType] || PortedConfig.dropsiteMinResourceAmount;
};

ConstructionManager.prototype.getDropsiteClusterRange = function(resourceType)
{
	const ranges = PortedConfig.dropsiteClusterRanges || {};
	return ranges[resourceType] || PortedConfig.dropsiteClusterRange;
};

ConstructionManager.prototype.getDropsiteMaxAnchorRange = function(resourceType)
{
	const ranges = PortedConfig.dropsiteMaxAnchorRanges || {};
	return ranges[resourceType] || PortedConfig.dropsiteMaxAnchorRange;
};

ConstructionManager.prototype.getDropsiteTypePriority = function(resourceType)
{
	const priorities = PortedConfig.dropsiteTypePriority || {};
	return priorities[resourceType] || 0;
};

ConstructionManager.prototype.hasNearbyDropsite = function(gameState, resourceType, pos)
{
	const dropsites = gameState.getOwnDropsites(resourceType);
	if (!dropsites || !dropsites.hasEntities())
		return false;

	const maxDist = PortedConfig.dropsiteExistingRange * PortedConfig.dropsiteExistingRange;
	for (const dropsite of dropsites.values())
	{
		const dropsitePos = dropsite.position && dropsite.position();
		if (dropsitePos && this.distanceSquared(pos, dropsitePos) < maxDist)
			return true;
	}
	return false;
};

ConstructionManager.prototype.hasStorehouseLikeStructure = function(gameState)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return false;

	for (const ent of entities.values())
		if (ent.templateName && this.isStorehouseLikeTemplate(gameState, ent.templateName()))
			return true;

	return false;
};

ConstructionManager.prototype.hasNearbyStorehouseLikeDropsite = function(gameState, pos)
{
	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return false;

	const maxDist = (PortedConfig.dropsiteAnyExistingRange || PortedConfig.dropsiteExistingRange) *
		(PortedConfig.dropsiteAnyExistingRange || PortedConfig.dropsiteExistingRange);
	for (const ent of entities.values())
	{
		const entPos = ent.position && ent.position();
		if (!entPos || this.distanceSquared(pos, entPos) >= maxDist)
			continue;

		if (ent.templateName && this.isStorehouseLikeTemplate(gameState, ent.templateName()))
			return true;
	}
	return false;
};

ConstructionManager.prototype.getConstructionAnchor = function(gameState)
{
	const structures = gameState.getOwnStructures();
	if (!structures || !structures.hasEntities())
		return undefined;

	let fallback;
	for (const structure of structures.values())
	{
		if (!structure.position || !structure.position())
			continue;

		if (!fallback)
			fallback = structure;

		if (structure.hasClass && structure.hasClass("CivCentre"))
			return structure;

		if (structure.hasClass && structure.hasClass("CivilCentre"))
			return structure;
	}

	return fallback;
};

ConstructionManager.prototype.getFieldAnchor = function(gameState)
{
	const dropsites = gameState.getOwnDropsites && gameState.getOwnDropsites("food");
	if (dropsites && dropsites.hasEntities())
	{
		for (const dropsite of dropsites.values())
			if (dropsite.position && dropsite.position())
				return dropsite;
	}

	return undefined;
};

ConstructionManager.prototype.getPlacementNear = function(gameState, player, templateName, anchorPos)
{
	if (!anchorPos)
		return undefined;

	const best = findBestBuildPosition(gameState, player, templateName, anchorPos, {
		"kind": "house",
		"maxRange": PortedConfig.housePlacementMaxRange || 140,
		"roomy": true,
		"spacing": 0
	});
	if (best)
		return best;

	const radii = PortedConfig.housePlacementRadii || [80];
	const angleSlots = 16;
	const attempts = radii.length * angleSlots;
	for (let i = 0; i < attempts; ++i)
	{
		const position = this.getSpiralPosition(anchorPos, this.placementCursor++, radii, angleSlots);
		if (this.isInOwnTerritory(gameState, player, position))
			return position;
	}
	return undefined;
};

ConstructionManager.prototype.getDropsitePlacementNear = function(gameState, player, templateName, resourcePos)
{
	if (!resourcePos)
		return undefined;

	const best = findBestBuildPosition(gameState, player, templateName, resourcePos, {
		"kind": "dropsite",
		"maxRange": PortedConfig.dropsitePlacementMaxRange || 80,
		"spacing": 0
	});
	if (best)
		return best;

	const radii = PortedConfig.dropsitePlacementRadii || [50];
	const angleSlots = 12;
	const attempts = radii.length * angleSlots;
	for (let i = 0; i < attempts; ++i)
	{
		const position = this.getSpiralPosition(resourcePos, this.dropsitePlacementCursor++, radii, angleSlots);
		if (this.isInOwnTerritory(gameState, player, position))
			return position;
	}
	return undefined;
};

ConstructionManager.prototype.getFieldPlacementNear = function(gameState, player, templateName, anchorPos)
{
	if (!anchorPos)
		return undefined;

	const best = findBestBuildPosition(gameState, player, templateName, anchorPos, {
		"kind": "field",
		"maxRange": PortedConfig.fieldPlacementMaxRange || 100,
		"spacing": 0
	});
	if (best)
		return best;

	const radii = PortedConfig.fieldPlacementRadii || [60];
	const angleSlots = 16;
	const attempts = radii.length * angleSlots;
	for (let i = 0; i < attempts; ++i)
	{
		const position = this.getSpiralPosition(anchorPos, this.fieldPlacementCursor++, radii, angleSlots);
		if (this.isInOwnTerritory(gameState, player, position))
			return position;
	}
	return undefined;
};

ConstructionManager.prototype.getMilitaryPlacementNear = function(gameState, player, templateName, anchorPos)
{
	if (!anchorPos)
		return undefined;

	const best = findBestBuildPosition(gameState, player, templateName, anchorPos, {
		"kind": "military",
		"maxRange": PortedConfig.militaryPlacementMaxRange || 360,
		"spacing": PortedConfig.militaryPlacementSpacing || 8
	});
	if (best)
		return best;

	const radii = PortedConfig.militaryPlacementRadii || [100];
	const angleSlots = PortedConfig.militaryPlacementAngleSlots || 16;
	const attempts = radii.length * angleSlots;
	let relaxedFallback;
	let territoryFallback;
	for (let i = 0; i < attempts; ++i)
	{
		const position = this.getSpiralPosition(anchorPos, this.militaryPlacementCursor++, radii, angleSlots);
		if (!this.isInOwnTerritory(gameState, player, position))
			continue;

		if (!territoryFallback)
			territoryFallback = position;

		if (this.isMilitaryPlacementClear(gameState, position))
			return position;

		if (!relaxedFallback && this.isMilitaryPlacementRelaxedClear(gameState, position))
			relaxedFallback = position;
	}
	return relaxedFallback || territoryFallback;
};

ConstructionManager.prototype.getSupportPlacementNear = function(gameState, player, templateName, anchorPos)
{
	if (!anchorPos)
		return undefined;

	const best = findBestBuildPosition(gameState, player, templateName, anchorPos, {
		"kind": "support",
		"maxRange": PortedConfig.supportPlacementMaxRange || 320,
		"spacing": PortedConfig.supportPlacementSpacing || 6
	});
	if (best)
		return best;

	const radii = PortedConfig.supportPlacementRadii || [160, 220, 280];
	const angleSlots = PortedConfig.supportPlacementAngleSlots || 24;
	const attempts = radii.length * angleSlots;
	for (let i = 0; i < attempts; ++i)
	{
		const position = this.getSpiralPosition(anchorPos, this.supportPlacementCursor++, radii, angleSlots);
		if (this.isInOwnTerritory(gameState, player, position))
			return position;
	}
	return undefined;
};

ConstructionManager.prototype.isMilitaryPlacementClear = function(gameState, position)
{
	if (!this.isFarFromOwnEntities(gameState, position, PortedConfig.militaryStructureClearance))
		return false;

	return this.isFarFromResourceSupplies(gameState, position, PortedConfig.militaryResourceClearance);
};

ConstructionManager.prototype.isMilitaryPlacementRelaxedClear = function(gameState, position)
{
	if (!this.isFarFromOwnEntities(gameState, position, PortedConfig.militaryRelaxedStructureClearance))
		return false;

	return true;
};

ConstructionManager.prototype.isFarFromOwnEntities = function(gameState, position, clearance)
{
	if (!clearance)
		return true;

	const entities = gameState.getOwnEntities();
	if (!entities || !entities.hasEntities())
		return true;

	const maxDist = clearance * clearance;
	const pos = [position.x, position.z];
	for (const ent of entities.values())
	{
		const entPos = ent.position && ent.position();
		if (entPos && this.distanceSquared(pos, entPos) < maxDist)
			return false;
	}
	return true;
};

ConstructionManager.prototype.isFarFromResourceSupplies = function(gameState, position, clearance)
{
	if (!clearance)
		return true;

	const maxDist = clearance * clearance;
	const pos = [position.x, position.z];
	for (const type of PortedConfig.resourceTypes)
	{
		const resources = gameState.getResourceSupplies(type);
		if (!resources || !resources.hasEntities())
			continue;

		for (const resource of resources.values())
		{
			const resourcePos = resource.position && resource.position();
			if (resourcePos && this.distanceSquared(pos, resourcePos) < maxDist)
				return false;
		}
	}
	return true;
};

ConstructionManager.prototype.getSpiralPosition = function(anchorPos, cursor, radii, angleSlots)
{
	const radius = radii[Math.floor(cursor / angleSlots) % radii.length];
	const angle = (cursor % angleSlots) * 2 * Math.PI / angleSlots;
	return {
		"x": anchorPos[0] + Math.cos(angle) * radius,
		"z": anchorPos[1] + Math.sin(angle) * radius
	};
};

ConstructionManager.prototype.isInOwnTerritory = function(gameState, player, position)
{
	const territoryMap = gameState.ai && gameState.ai.territoryMap;
	if (!territoryMap || !territoryMap.data || !territoryMap.cellSize || !territoryMap.width)
		return true;

	const x = Math.floor(position.x / territoryMap.cellSize);
	const z = Math.floor(position.z / territoryMap.cellSize);
	const height = territoryMap.height || territoryMap.width;
	if (x < 0 || z < 0 || x >= territoryMap.width || z >= height)
		return false;

	const owner = territoryMap.data[x + territoryMap.width * z] & 0x1F;
	return owner == player;
};

ConstructionManager.prototype.distanceSquared = function(a, b)
{
	const dx = a[0] - b[0];
	const dz = a[1] - b[1];
	return dx * dx + dz * dz;
};

ConstructionManager.prototype.angleFromAnchor = function(anchorPos, position)
{
	if (!anchorPos || !position)
		return 0;

	return Math.atan2(position.x - anchorPos[0], position.z - anchorPos[1]);
};
