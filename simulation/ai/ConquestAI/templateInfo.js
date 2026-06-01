function cleanTemplateName(templateName)
{
	if (!templateName)
		return undefined;

	return templateName.indexOf("foundation|") === 0 ?
		templateName.substring("foundation|".length) :
		templateName;
}

export function getTemplate(gameState, templateName)
{
	const cleanName = cleanTemplateName(templateName);
	if (!cleanName || !gameState || !gameState.getTemplate)
		return undefined;

	return gameState.getTemplate(cleanName);
}

function getRawTemplateData(gameState, templateName)
{
	const template = getTemplate(gameState, templateName);
	return template && template._template;
}

function getRawTemplateValue(template, path)
{
	if (!template)
		return undefined;

	let value = template;
	for (const part of path.split("/"))
	{
		value = value && value[part];
		if (value === undefined)
			return undefined;
	}
	return value;
}

export function getTemplateCategory(gameState, templateName)
{
	return getRawTemplateValue(
		getRawTemplateData(gameState, templateName),
		"BuildRestrictions/Category");
}

export function getTemplateClasses(gameState, templateName)
{
	const identity = getRawTemplateValue(
		getRawTemplateData(gameState, templateName),
		"Identity");
	if (!identity)
		return [];

	const classes = [];
	for (const field of ["Classes", "VisibleClasses"])
		if (identity[field] && identity[field]._string)
			for (const className of identity[field]._string.split(/\s+/))
				if (className && classes.indexOf(className) === -1)
					classes.push(className);
	return classes;
}

export function hasTemplateClass(gameState, templateName, className)
{
	return getTemplateClasses(gameState, templateName).indexOf(className) !== -1;
}

export function hasTemplateComponent(gameState, templateName, componentName)
{
	return !!getRawTemplateValue(
		getRawTemplateData(gameState, templateName),
		componentName);
}

export function getTemplateAIBuild(gameState, templateName)
{
	const aiBuild = getRawTemplateValue(
		getRawTemplateData(gameState, templateName),
		"Identity/AIBuild");
	if (!aiBuild)
		return undefined;

	return {
		"maxCopies": aiBuild.MaxCopies !== undefined ? +aiBuild.MaxCopies : undefined,
		"minPop": aiBuild.MinPop !== undefined ? +aiBuild.MinPop : undefined
	};
}

export function getTemplateCost(gameState, templateName)
{
	const resources = getRawTemplateValue(
		getRawTemplateData(gameState, templateName),
		"Cost/Resources");
	if (!resources)
		return {};

	const costs = {};
	for (const resource in resources)
		costs[resource] = +resources[resource];
	return costs;
}

export function isPlotTemplate(gameState, templateName)
{
	return !!getRawTemplateValue(
		getRawTemplateData(gameState, templateName),
		"Plots/IsPlot");
}

export function getTemplateUpgrades(gameState, templateName)
{
	const upgrades = getRawTemplateValue(
		getRawTemplateData(gameState, templateName),
		"Upgrade");
	if (!upgrades)
		return [];

	const ret = [];
	for (const key in upgrades)
	{
		const upgrade = upgrades[key];
		if (!upgrade || !upgrade.Entity)
			continue;

		const costs = {};
		if (upgrade.Cost)
			for (const resource in upgrade.Cost)
				costs[resource] = +upgrade.Cost[resource];

		ret.push({
			"name": key,
			"template": upgrade.Entity,
			"cost": costs
		});
	}
	return ret;
}

export function getTemplateResourceDropsiteTypes(gameState, templateName)
{
	const types = getRawTemplateValue(
		getRawTemplateData(gameState, templateName),
		"ResourceDropsite/Types");
	return types ? String(types).split(/\s+/) : [];
}

export function getTemplatePlacementType(gameState, templateName)
{
	return getRawTemplateValue(
		getRawTemplateData(gameState, templateName),
		"BuildRestrictions/PlacementType") || "land";
}

export function getTemplateBuildTerritories(gameState, templateName)
{
	const territory = getRawTemplateValue(
		getRawTemplateData(gameState, templateName),
		"BuildRestrictions/Territory");
	return territory ? String(territory).split(/\s+/) : undefined;
}

export function getTemplateObstructionRadius(gameState, templateName)
{
	const obstruction = getRawTemplateValue(
		getRawTemplateData(gameState, templateName),
		"Obstruction");
	if (!obstruction)
		return { "max": 0, "min": 0 };

	if (obstruction.Static)
	{
		const width = +obstruction.Static["@width"];
		const depth = +obstruction.Static["@depth"];
		return {
			"max": Math.sqrt(width * width + depth * depth) / 2,
			"min": Math.min(width, depth) / 2
		};
	}

	if (obstruction.Unit)
	{
		const radius = +obstruction.Unit["@radius"];
		return { "max": radius, "min": radius };
	}

	return { "max": 0, "min": 0 };
}
