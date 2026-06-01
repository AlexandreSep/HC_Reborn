/**
 * This array determines the order in which the GUI controls are shown in the GameSettingTabs panel.
 */
var g_GameSettingsLayout = [
	{
		"label": translateWithContext("Match settings tab name", "Map"),
		"settings": [
			"MapType",
			"MapFilter",
			"MapSelection",
			"MapBrowser",
			"MapSize",
			"PlayerPlacement",
			"Landscape",
			"Biome",
			"SeaLevelRiseTime",
			"Daytime",
			"TriggerDifficulty",
			"Nomad",
			"Treasures",
			"ExploredMap",
			"RevealedMap"
		]
	},
	{
		"label": translateWithContext("Match settings tab name", "Player"),
		"settings": [
			"PlayerCount",
			"PopulationCapType",
			"PopulationCap",
			"StartingResources",
			"Spies",
			"Cheats",
			//HC-Code
			"DisableHeroes",
			"AllowHeroSelectionDuringMatch",
			"HeroCount"
			//HC-End
		]
	},
	{
		"label": translateWithContext("Match settings tab name", "Game Type"),
		"settings": [
			...g_VictoryConditions.map(victoryCondition => victoryCondition.Name),
			"RelicCount",
			"RelicDuration",
			"RegicideGarrison",
			"WonderDuration",
			"GameSpeed",
			"Ceasefire",
			"LockedTeams",
			"LastManStanding",
			"Rating"
		]
	}
];
