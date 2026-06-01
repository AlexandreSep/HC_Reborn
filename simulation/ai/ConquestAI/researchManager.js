import { PortedConfig } from "simulation/ai/ConquestAI/portedConfig.js";
import { postResearch } from "simulation/ai/ConquestAI/commands.js";
import { getTemplateCategory } from "simulation/ai/ConquestAI/templateInfo.js";

export function ResearchManager(data)
{
	this.lastResearchTime = data && data.lastResearchTime || -Infinity;
	this.techCursor = data && data.techCursor || 0;
}

ResearchManager.prototype.Serialize = function()
{
	return {
		"lastResearchTime": this.lastResearchTime,
		"techCursor": this.techCursor
	};
};

ResearchManager.prototype.update = function(gameState, player, elapsedTime)
{
	if (elapsedTime - this.lastResearchTime < PortedConfig.researchIntervalSeconds)
		return;

	if (this.hasQueuedResearch(gameState))
		return;

	const plan = this.pickResearchPlan(gameState, elapsedTime);
	if (!plan)
		return;

	postResearch(player, plan.researcher, plan.tech);
	this.lastResearchTime = elapsedTime;
};

ResearchManager.prototype.pickResearchPlan = function(gameState, elapsedTime)
{
	const researchers = this.getResearchers(gameState);
	if (!researchers.length)
		return undefined;

	for (const researcher of researchers)
	{
		const candidates = this.getResearchableCandidates(gameState, researcher);
		const phase = this.pickPhaseTechnology(gameState, candidates);
		if (phase && this.canAffordTechnology(gameState, phase))
			return { "researcher": researcher, "tech": phase };
	}

	if ((gameState.getPopulation && gameState.getPopulation() || 0) < PortedConfig.researchMinPopulation)
		return undefined;

	if (this.hasReachedTownPhase(gameState))
	{
		const militaryPlan = this.pickPlanFromResearchers(
			gameState,
			researchers.filter(researcher => this.isMilitaryResearcher(gameState, researcher)),
			tech => this.isMilitaryTechnology(tech));
		if (militaryPlan)
			return militaryPlan;
	}

	const priorityPlan = this.pickPlanFromResearchers(
		gameState,
		researchers,
		tech => this.isPriorityTechnology(tech));
	if (priorityPlan)
		return priorityPlan;

	return this.pickPlanFromResearchers(gameState, researchers, () => true);
};

ResearchManager.prototype.hasQueuedResearch = function(gameState)
{
	const facilities = gameState.getOwnStructures && gameState.getOwnStructures();
	if (!facilities || !facilities.hasEntities())
		return false;

	for (const facility of facilities.values())
	{
		const queue = facility.trainingQueue && facility.trainingQueue();
		if (!queue)
			continue;

		for (const item of queue)
			if (item.technologyTemplate)
				return true;
	}
	return false;
};

ResearchManager.prototype.getResearcher = function(gameState)
{
	const structures = gameState.getOwnStructures && gameState.getOwnStructures();
	if (!structures || !structures.hasEntities())
		return undefined;

	let fallback;
	for (const structure of structures.values())
	{
		if (!structure.researchableTechs)
			continue;

		if (!fallback)
			fallback = structure;

		if (structure.hasClass && (structure.hasClass("CivCentre") || structure.hasClass("CivilCentre")))
			return structure;
	}
	return fallback;
};

ResearchManager.prototype.getResearchers = function(gameState)
{
	const structures = gameState.getOwnStructures && gameState.getOwnStructures();
	if (!structures || !structures.hasEntities())
		return [];

	const result = [];
	for (const structure of structures.values())
		if (structure.researchableTechs)
			result.push(structure);
	return result;
};

ResearchManager.prototype.pickTechnology = function(gameState, researcher, elapsedTime)
{
	const candidates = this.getResearchableCandidates(gameState, researcher);
	if (!candidates.length)
		return undefined;

	const phase = this.pickPhaseTechnology(gameState, candidates);
	if (phase && this.canAffordTechnology(gameState, phase))
		return phase;

	if ((gameState.getPopulation && gameState.getPopulation() || 0) < PortedConfig.researchMinPopulation)
		return undefined;

	const prioritized = candidates.filter(tech => this.isPriorityTechnology(tech));
	const pool = prioritized.length ? prioritized : candidates;
	for (let i = 0; i < pool.length; ++i)
	{
		const tech = pool[(this.techCursor + i) % pool.length];
		if (!this.canAffordTechnology(gameState, tech))
			continue;

		this.techCursor = (this.techCursor + i + 1) % pool.length;
		return tech;
	}
	return undefined;
};

ResearchManager.prototype.getResearchableCandidates = function(gameState, researcher)
{
	const civ = gameState.getPlayerCiv ? gameState.getPlayerCiv() : undefined;
	const techs = researcher.researchableTechs(gameState, civ) || [];
	return this.filterResearchableTechs(gameState, techs);
};

ResearchManager.prototype.pickPlanFromResearchers = function(gameState, researchers, predicate)
{
	for (const researcher of researchers)
	{
		const candidates = this.getResearchableCandidates(gameState, researcher).filter(predicate);
		if (!candidates.length)
			continue;

		for (let i = 0; i < candidates.length; ++i)
		{
			const tech = candidates[(this.techCursor + i) % candidates.length];
			if (!this.canAffordTechnology(gameState, tech))
				continue;

			this.techCursor = (this.techCursor + i + 1) % candidates.length;
			return { "researcher": researcher, "tech": tech };
		}
	}
	return undefined;
};

ResearchManager.prototype.filterResearchableTechs = function(gameState, techs)
{
	const result = [];
	for (const entry of techs)
	{
		if (!entry)
			continue;

		const options = entry.pair ? [entry.top, entry.bottom] : [entry];
		for (const tech of options)
		{
			if (!tech || tech.indexOf("-") === 0)
				continue;

			if (gameState.canResearch && !gameState.canResearch(tech))
				continue;

			if (gameState.isResearching && gameState.isResearching(tech))
				continue;

			if (gameState.isResearched && gameState.isResearched(tech))
				continue;

			result.push(tech);
		}
	}
	return result;
};

ResearchManager.prototype.pickPhaseTechnology = function(gameState, candidates)
{
	const pop = gameState.getPopulation ? gameState.getPopulation() : 0;
	if (pop >= PortedConfig.researchPhaseTownPopulation)
	{
		const town = candidates.find(tech => tech.indexOf("phase_town") === 0);
		if (town)
			return town;
	}

	if (pop >= PortedConfig.researchPhaseCityPopulation)
	{
		const city = candidates.find(tech => tech.indexOf("phase_city") === 0);
		if (city)
			return city;
	}

	return undefined;
};

ResearchManager.prototype.isPriorityTechnology = function(tech)
{
	const lower = String(tech).toLowerCase();
	for (const keyword of PortedConfig.researchPriorityKeywords)
		if (lower.indexOf(keyword) !== -1)
			return true;
	return false;
};

ResearchManager.prototype.isMilitaryTechnology = function(tech)
{
	const lower = String(tech).toLowerCase();
	for (const keyword of PortedConfig.researchMilitaryKeywords)
		if (lower.indexOf(keyword) !== -1)
			return true;
	return false;
};

ResearchManager.prototype.isMilitaryResearcher = function(gameState, researcher)
{
	if (!researcher || !researcher.templateName)
		return false;

	const templateName = researcher.templateName();
	const category = getTemplateCategory(gameState, templateName);
	if (category == "Barracks")
		return true;

	const lower = String(templateName || "").toLowerCase();
	return lower.indexOf("_barracks") !== -1 ||
		lower.endsWith("/barracks") ||
		lower.indexOf("_stable") !== -1 ||
		lower.indexOf("_stables") !== -1 ||
		lower.indexOf("_mercs") !== -1;
};

ResearchManager.prototype.hasReachedTownPhase = function(gameState)
{
	if (gameState.currentPhase && gameState.currentPhase() >= 2)
		return true;

	if (!gameState.isResearched)
		return false;

	return gameState.isResearched("phase_town") ||
		gameState.isResearched("phase_town_generic");
};

ResearchManager.prototype.canAffordTechnology = function(gameState, tech)
{
	const costs = this.getTechnologyCosts(tech);
	if (!costs)
		return true;

	const resources = gameState.getResources && gameState.getResources();
	if (!resources)
		return true;

	for (const resource in costs)
		if ((resources[resource] || 0) < costs[resource])
			return false;

	return true;
};

ResearchManager.prototype.getTechnologyCosts = function(tech)
{
	if (!Engine.ReadJSONFile)
		return undefined;

	try
	{
		const template = Engine.ReadJSONFile("simulation/data/technologies/" + tech + ".json");
		return template && template.cost;
	}
	catch (e)
	{
		return undefined;
	}
};
