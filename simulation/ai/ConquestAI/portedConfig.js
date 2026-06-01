export const PortedConfig = {
	"resourceTypes": ["wood", "food", "stone", "metal"],
	"militaryEconomyResourceTypes": ["wood", "food", "metal", "metal", "stone", "metal"],
	"workerTemplateKeywords": ["citizen", "laborer", "worker", "female", "artisan","tokayslaveA","bugblin","harvesterA","handmaidenA","peonA","aeralpeonA","serfA","shadowfolkA","stalchildA","servantA", "minerA","laborerA"],
	"maxQueuedWorkers": 1,
	"researchIntervalSeconds": 12,
	"researchMinPopulation": 18,
	"researchPhaseTownPopulation": 28,
	"researchPhaseCityPopulation": 65,
	"researchPriorityKeywords": ["gather", "wood", "stone", "rupee", "capacity", "training", "armor", "attack", "soldier", "levy"],
	"researchMilitaryKeywords": ["armor", "attack", "soldier", "training", "weapon", "shield", "bow", "spear", "sword", "cavalry"],
	"maxQueuedMilitary": 6,
	"maxQueuedMilitaryPerFacility": 1,
	"militaryTrainBatchSize": 1,
	"militaryRallyIntervalSeconds": 12,
	"militaryRallyRadius": 45,
	"militaryRallyOffset": 85,
	"militaryAttackMinUnits": 12,
	"militaryAttackMinUnitsVariance": 3,
	"militaryAttackWaveGrowthUnits": 2,
	"militaryAttackMaxUnits": 30,
	"militaryAttackGatherRadius": 55,
	"militaryAttackWaveCooldownSeconds": 75,
	"militaryAttackOrderIntervalSeconds": 30,
	"militaryDefenseOrderIntervalSeconds": 10,
	"militaryDefenseDurationSeconds": 45,
	"militaryDefenseBaseRadius": 160,
	"militaryUnitTemplateExcludes": ["titan", "trader", "merchant", "worker", "citizen", "female", "support", "healer", "packed"],
	"militaryUnitClassExcludes": ["Worker", "Citizen", "FemaleCitizen", "Support", "Healer", "Domestic"],
	"maxFoundations": 2,
	"houseMinCount": 2,
	"housePopBuffer": 6,
	"constructionIntervalTurns": 6,
	"constructionPlacementRetrySeconds": 2,
	"plotUpgradePendingSeconds": 45,
	"militaryPlacementRetrySeconds": 2,
	"houseBuildCooldownSeconds": 60,
	"housePendingPopulationBonus": 15,
	"housePlacementRadii": [60, 80, 100, 120],
	"fieldBuildCooldownSeconds": 45,
	"fieldRequestPendingSeconds": 4,
	"fieldPlacementRadii": [45, 60, 75, 90],
	"fieldMinCount": 1,
	"fieldPopulationDivisor": 8,
	"fieldMaxCount": 10,
	"fieldTargets": {
		"defaultMin": 1,
		"defaultMax": 10,
		"defaultPopulationDivisor": 8,
		"hylian": { "min": 2, "max": 3, "populationDivisor": 30 },
		"gerudo": { "min": 1, "max": 2, "populationDivisor": 30 }
	},
	"militaryBuildCooldownSeconds": 100,
	"militaryRequestPendingSeconds": 4,
	"militaryPlacementRadii": [120, 160, 200, 240, 280, 340, 400],
	"militaryPlacementAngleSlots": 32,
	"militaryStructureClearance": 50,
	"militaryRelaxedStructureClearance": 35,
	"militaryResourceClearance": 35,
	"militaryMinPopulation": 12,
	"militaryPopulationDivisor": 25,
	"militaryMaxProductionBuildings": 4,
	"supportBuildCooldownSeconds": 120,
	"supportRequestPendingSeconds": 4,
	"supportMinPopulation": 40,
	"supportMinMilitaryProductionBuildings": 2,
	"supportRequireTownPhase": true,
	"supportMaxBuildings": 6,
	"supportPlacementRadii": [140, 180, 220, 280, 340],
	"dropsiteBuildCooldownSeconds": 90,
	"dropsiteRequestPendingSeconds": 4,
	"dropsitePlacementRadii": [35, 50, 65, 80],
	"dropsiteMinResourceAmount": 800,
	"dropsiteMinResourceAmounts": {
		"wood": 400,
		"food": 300,
		"stone": 800,
		"metal": 800
	},
	"dropsiteClusterRange": 55,
	"dropsiteClusterRanges": {
		"wood": 90,
		"food": 70,
		"stone": 55,
		"metal": 55
	},
	"dropsiteExistingRange": 70,
	"dropsiteAnyExistingRange": 240,
	"dropsiteMaxAnchorRange": 220,
	"dropsiteMaxAnchorRanges": {
		"wood": 320,
		"food": 260,
		"stone": 220,
		"metal": 220
	},
	"dropsiteTypePriority": {
		"wood": 0,
		"food": 1500,
		"stone": 10000,
		"metal": 12000
	},
	"dropsiteDebugIntervalSeconds": 60,
	"earlyResourceBanSeconds": 180,
	"startStrategyBan": {
		"hylian": { "stone": true, "metal": true },
		"gerudo": { "stone": true, "metal": true },
		"goron": { "metal": true },
		"zora": { "metal": true },
		"ordona": { "stone": true, "metal": true },
		"lanayru": { "stone": true, "metal": true },
		"darknut": { "metal": true },
		"deku": { "stone": true, "metal": true },
		"fairy": { "stone": true, "metal": true }
	},
	"citizenTargets": {
		"defaultRatio": 0.35,
		"defaultMin": 8,
		"defaultMax": 35,
		"zora": { "ratio": 0.35, "min": 10, "max": 16 }
	}
};

export function getCivConfig(config, civ)
{
	return {
		"startStrategyBan": config.startStrategyBan[civ] || {},
		"fieldTargets": config.fieldTargets[civ] || {
			"min": config.fieldTargets.defaultMin,
			"max": config.fieldTargets.defaultMax,
			"populationDivisor": config.fieldTargets.defaultPopulationDivisor
		},
		"citizenTargets": config.citizenTargets[civ] || {
			"ratio": config.citizenTargets.defaultRatio,
			"min": config.citizenTargets.defaultMin,
			"max": config.citizenTargets.defaultMax
		}
	};
}
