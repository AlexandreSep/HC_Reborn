import { InfoMap } from "simulation/ai/common-api/map-module.js";
import { getMapIndices } from "simulation/ai/common-api/utils.js";
import {
	getTemplateBuildTerritories,
	getTemplateObstructionRadius,
	getTemplatePlacementType,
	hasTemplateClass
} from "simulation/ai/ConquestAI/templateInfo.js";

const TERRITORY_PLAYER_MASK = 0x1F;
const TERRITORY_BLINKING_MASK = 0x40;
const BORDER_OUTSIDE = 1;
const BORDER_MAP_EDGE = 2;
const BORDER_FULL = BORDER_OUTSIDE | BORDER_MAP_EDGE;
const BORDER_NARROW_FRONTIER = 4;
const BORDER_LARGE_FRONTIER = 8;

function mapIndexToPosition(map, index)
{
	return [
		(index % map.width + 0.5) * map.cellSize,
		(Math.floor(index / map.width) + 0.5) * map.cellSize
	];
}

function territoryOwnerAtIndex(territoryMap, index)
{
	return territoryMap.data[index] & TERRITORY_PLAYER_MASK;
}

function isConnectedTerritory(territoryMap, index)
{
	return (territoryMap.data[index] & TERRITORY_BLINKING_MASK) == 0;
}

export function createTerritoryMap(gameState)
{
	const territoryMap = gameState.ai && gameState.ai.territoryMap;
	if (!territoryMap)
		return undefined;

	const map = new InfoMap(gameState.sharedScript, "territory", territoryMap.data);
	map.getOwner = function(p) { return this.point(p) & TERRITORY_PLAYER_MASK; };
	map.getOwnerIndex = function(i) { return this.map[i] & TERRITORY_PLAYER_MASK; };
	map.isBlinking = function(p) { return (this.point(p) & TERRITORY_BLINKING_MASK) != 0; };
	return map;
}

export function createBorderMap(gameState, player)
{
	const map = new InfoMap(gameState.sharedScript, "territory");
	const passabilityMap = gameState.getPassabilityMap && gameState.getPassabilityMap();
	if (!passabilityMap)
		return map;

	const width = map.width;
	const height = map.height || map.width;
	const border = Math.round(80 / map.cellSize);
	const obstructionMask = gameState.getPassabilityClassMask("unrestricted");

	if (gameState.circularMap)
	{
		const center = (width - 1) / 2;
		const radiusCut = (center - border) * (center - border);
		for (let i = 0; i < map.length; ++i)
		{
			const dx = i % width - center;
			const dz = Math.floor(i / width) - center;
			if (dx * dx + dz * dz < radiusCut)
				continue;
			markMapBorderCell(map, passabilityMap, obstructionMask, i);
		}
	}
	else
	{
		const borderCutX = width - border;
		const borderCutZ = height - border;
		for (let i = 0; i < map.length; ++i)
		{
			const x = i % width;
			const z = Math.floor(i / width);
			if (x < border || x >= borderCutX || z < border || z >= borderCutZ)
				markMapBorderCell(map, passabilityMap, obstructionMask, i);
		}
	}

	addTerritoryFrontier(gameState, player, map);
	return map;
}

function markMapBorderCell(map, passabilityMap, obstructionMask, index)
{
	map.map[index] = BORDER_OUTSIDE;
	for (const passabilityIndex of getMapIndices(index, map, passabilityMap))
	{
		if (passabilityMap.data[passabilityIndex] & obstructionMask)
			continue;
		map.map[index] = BORDER_MAP_EDGE;
		break;
	}
}

function addTerritoryFrontier(gameState, player, borderMap)
{
	const territoryMap = gameState.ai && gameState.ai.territoryMap;
	if (!territoryMap || !territoryMap.data)
		return;

	const width = borderMap.width;
	const height = borderMap.height || borderMap.width;
	for (let i = 0; i < borderMap.length; ++i)
	{
		if (borderMap.map[i] & BORDER_OUTSIDE)
			continue;
		if (territoryOwnerAtIndex(territoryMap, i) != player)
			continue;

		const x = i % width;
		const z = Math.floor(i / width);
		if (hasNonOwnNeighbor(territoryMap, player, x, z, width, height, 1))
			borderMap.map[i] |= BORDER_NARROW_FRONTIER;
		else if (hasNonOwnNeighbor(territoryMap, player, x, z, width, height, 3))
			borderMap.map[i] |= BORDER_LARGE_FRONTIER;
	}
}

function hasNonOwnNeighbor(territoryMap, player, x, z, width, height, radius)
{
	for (let dz = -radius; dz <= radius; ++dz)
		for (let dx = -radius; dx <= radius; ++dx)
		{
			if (!dx && !dz)
				continue;
			const nx = x + dx;
			const nz = z + dz;
			if (nx < 0 || nz < 0 || nx >= width || nz >= height)
				return true;
			if (territoryOwnerAtIndex(territoryMap, nx + width * nz) != player)
				return true;
		}
	return false;
}

function canBuildInTerritory(gameState, player, templateName, owner, connected)
{
	const territories = getTemplateBuildTerritories(gameState, templateName);
	if (!territories)
		return owner == player || owner == 0 || gameState.isPlayerMutualAlly && gameState.isPlayerMutualAlly(owner);

	if (owner == player)
		return territories.indexOf("own") !== -1 || territories.indexOf("neutral") !== -1 && !connected;
	if (owner == 0)
		return territories.indexOf("neutral") !== -1;
	if (gameState.isPlayerMutualAlly && gameState.isPlayerMutualAlly(owner))
		return territories.indexOf("ally") !== -1 || territories.indexOf("neutral") !== -1 && !connected;
	return territories.indexOf("enemy") !== -1;
}

export function createObstructionMap(gameState, player, templateName)
{
	const passabilityMap = gameState.getPassabilityMap();
	const territoryMap = gameState.ai && gameState.ai.territoryMap;
	if (!passabilityMap || !territoryMap)
		return undefined;

	const ratio = Math.max(1, Math.round(territoryMap.cellSize / passabilityMap.cellSize));
	const placementType = getTemplatePlacementType(gameState, templateName);
	const obstructionMask = gameState.getPassabilityClassMask(
		placementType == "shore" ? "building-shore" : "building-land");
	const passMap = placementType == "shore" ?
		gameState.ai.accessibility && gameState.ai.accessibility.navalPassMap :
		gameState.ai.accessibility && gameState.ai.accessibility.landPassMap;

	const obstructionTiles = new Uint8Array(passabilityMap.data.length);
	for (let k = 0; k < territoryMap.data.length; ++k)
	{
		const owner = territoryOwnerAtIndex(territoryMap, k);
		if (!canBuildInTerritory(gameState, player, templateName, owner, isConnectedTerritory(territoryMap, k)))
			continue;

		const x = ratio * (k % territoryMap.width);
		const y = ratio * Math.floor(k / territoryMap.width);
		for (let ix = 0; ix < ratio; ++ix)
			for (let iy = 0; iy < ratio; ++iy)
			{
				const i = x + ix + (y + iy) * passabilityMap.width;
				if (passMap && placementType != "shore" && passMap[i] < 2)
					continue;
				if (!(passabilityMap.data[i] & obstructionMask))
					obstructionTiles[i] = 255;
			}
	}

	const map = new InfoMap(gameState.sharedScript, "passability", obstructionTiles);
	map.setMaxVal(255);
	return map;
}

export function findBestBuildPosition(gameState, player, templateName, anchorPos, options = {})
{
	if (!anchorPos)
		return undefined;

	const territoryMap = gameState.ai && gameState.ai.territoryMap;
	if (!territoryMap || !territoryMap.data)
		return undefined;

	const placement = new InfoMap(gameState.sharedScript, "territory");
	const cellSize = placement.cellSize;
	const anchorX = Math.floor(anchorPos[0] / cellSize);
	const anchorZ = Math.floor(anchorPos[1] / cellSize);
	const maxRange = options.maxRange || 220;
	placement.addInfluence(anchorX, anchorZ, Math.max(1, maxRange / cellSize), 255);

	addStructureInfluence(gameState, placement, templateName, options);
	addResourceInfluence(gameState, placement, templateName, options);
	filterPlacementMap(gameState, player, templateName, placement, anchorPos, maxRange, createBorderMap(gameState, player));

	const obstructions = createObstructionMap(gameState, player, templateName);
	if (!obstructions)
		return undefined;

	const obstructionRadius = getTemplateObstructionRadius(gameState, templateName);
	const spacing = options.spacing !== undefined ? options.spacing : 4;
	const radius = Math.max(1, Math.ceil((obstructionRadius.max + spacing) / obstructions.cellSize));
	const roomyRadius = options.roomy ? Math.max(radius, 3 * radius) : radius;
	let bestTile = placement.findBestTile(roomyRadius, obstructions);
	if (!bestTile.val && roomyRadius != radius)
		bestTile = placement.findBestTile(radius, obstructions);
	if (!bestTile.val)
		return undefined;

	const position = mapIndexToPosition(obstructions, bestTile.idx);
	return { "x": position[0], "z": position[1] };
}

function addStructureInfluence(gameState, placement, templateName, options)
{
	const structures = gameState.getOwnStructures && gameState.getOwnStructures();
	if (!structures || !structures.hasEntities())
		return;

	const isHouse = hasTemplateClass(gameState, templateName, "House");
	const isField = hasTemplateClass(gameState, templateName, "Field") ||
		hasTemplateClass(gameState, templateName, "Farmstead");
	const isMilitary = hasTemplateClass(gameState, templateName, "Barracks") ||
		options.kind == "military";

	for (const structure of structures.values())
	{
		const pos = structure.position && structure.position();
		if (!pos)
			continue;

		const x = Math.round(pos[0] / placement.cellSize);
		const z = Math.round(pos[1] / placement.cellSize);

		if (isHouse)
			placement.addInfluence(x, z, 60 / placement.cellSize, structure.hasClass && structure.hasClass("House") ? 40 : -12);
		else if (isField && structure.resourceDropsiteTypes && structure.resourceDropsiteTypes() &&
			structure.resourceDropsiteTypes().indexOf("food") !== -1)
			placement.addInfluence(x, z, 80 / placement.cellSize, 60);
		else if (isMilitary)
			placement.addInfluence(x, z, 55 / placement.cellSize, -35);
		else
			placement.addInfluence(x, z, 70 / placement.cellSize, -8);
	}
}

function addResourceInfluence(gameState, placement, templateName, options)
{
	if (options.kind == "dropsite")
		return;

	for (const resource in gameState.sharedScript.resourceMaps || {})
	{
		const resourceMap = gameState.sharedScript.resourceMaps[resource];
		if (!resourceMap)
			continue;

		for (let i = 0; i < placement.map.length; ++i)
			if (placement.map[i] > 0)
				placement.set(i, placement.map[i] - resourceMap.map[i] / (options.kind == "military" ? 2 : 4));
	}
}

function filterPlacementMap(gameState, player, templateName, placement, anchorPos, maxRange, borderMap)
{
	const territoryMap = gameState.ai.territoryMap;
	const maxDist = maxRange * maxRange;
	for (let i = 0; i < placement.map.length; ++i)
	{
		if (!placement.map[i])
			continue;

		const owner = territoryOwnerAtIndex(territoryMap, i);
		if (!canBuildInTerritory(gameState, player, templateName, owner, isConnectedTerritory(territoryMap, i)))
		{
			placement.map[i] = 0;
			continue;
		}

		const pos = mapIndexToPosition(placement, i);
		const dx = pos[0] - anchorPos[0];
		const dz = pos[1] - anchorPos[1];
		if (dx * dx + dz * dz > maxDist)
		{
			placement.map[i] = 0;
			continue;
		}

		if (!borderMap || !borderMap.map[i])
			continue;

		if (borderMap.map[i] & BORDER_OUTSIDE)
		{
			placement.map[i] = 0;
			continue;
		}

		if (borderMap.map[i] & BORDER_NARROW_FRONTIER)
			placement.set(i, placement.map[i] / 4);
		else if (borderMap.map[i] & BORDER_LARGE_FRONTIER)
			placement.set(i, placement.map[i] / 2);
		else if (borderMap.map[i] & BORDER_FULL)
			placement.set(i, placement.map[i] / 2);
	}
}
