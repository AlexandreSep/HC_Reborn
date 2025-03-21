/**
 * The maximum number of players that the engine supports.
 * TODO: Maybe we can support more than 8 players sometime.
 */
const g_MaxPlayers = 8;

/**
 * The maximum number of teams allowed.
 */
const g_MaxTeams = 4;

/**
 * Directory containing all editable settings.
 */
const g_SettingsDirectory = "simulation/data/settings/";

/**
 * Directory containing all biomes supported for random map scripts.
 */
const g_BiomesDirectory = "maps/random/rmbiome/";


/**
 * An object containing all values given by setting name.
 * Used by lobby, game setup, session, summary screen, and replay menu.
 */
const g_Settings = loadSettingsValues();

/**
 * Loads and translates all values of all settings which
 * can be configured by dropdowns in the game setup.
 *
 * @returns {Object|undefined}
 */
function loadSettingsValues()
{
	var settings = {
		"AIDescriptions": loadAIDescriptions(),
		"AIDifficulties": loadAIDifficulties(),
		"AIBehaviors": loadAIBehaviors(),
		"GameSpeeds": loadSettingValuesFile("game_speeds.json"),
		"MapTypes": loadMapTypes(),
		"MapSizes": loadSettingValuesFile("map_sizes.json"),
		"Biomes": loadBiomes(),
		"PlayerDefaults": loadPlayerDefaults(),
		"PopulationCapacities": loadPopulationCapacities(),
		"WorldPopulationCapacities": loadWorldPopulationCapacities(),
		"StartingResources": loadSettingValuesFile("starting_resources.json"),
		"VictoryConditions": loadVictoryConditions(),
		"TriggerDifficulties": loadSettingValuesFile("trigger_difficulties.json")
	};

	if (Object.keys(settings).some(key => settings[key] === undefined))
		return undefined;

	return deepfreeze(settings);
}

/**
 * Returns an array of objects reflecting all possible values for a given setting.
 *
 * @param {string} filename
 * @see simulation/data/settings/
 * @returns {Array|undefined}
 */
function loadSettingValuesFile(filename)
{
	var json = Engine.ReadJSONFile(g_SettingsDirectory + filename);

	if (!json || !json.Data)
	{
		error("Could not load " + filename + "!");
		return undefined;
	}

	if (json.TranslatedKeys)
	{
		let keyContext = json.TranslatedKeys;

		if (json.TranslationContext)
		{
			keyContext = {};
			for (let key of json.TranslatedKeys)
				 keyContext[key] = json.TranslationContext;
		}

		translateObjectKeys(json.Data, keyContext);
	}

	return json.Data;
}

/**
 * Loads the descriptions as defined in simulation/ai/.../data.json and loaded by ICmpAIManager.cpp.
 *
 * @returns {Array}
 */
function loadAIDescriptions()
{
	var ais = Engine.GetAIs();
	translateObjectKeys(ais, ["name", "description"]);
	return ais.sort((a, b) => a.data.name.localeCompare(b.data.name));
}

/**
 * Hardcoded, as modding is not supported without major changes.
 * Notice the AI code parses the difficulty level by the index, not by name.
 *
 * @returns {Array}
 */
function loadAIDifficulties()
{
	return [
		{
			"Name": "sandbox",
			"Title": translateWithContext("aiDiff", "Sandbox")
		},
		{
			"Name": "very easy",
			"Title": translateWithContext("aiDiff", "Very Easy")
		},
		{
			"Name": "easy",
			"Title": translateWithContext("aiDiff", "Easy")
		},
		{
			"Name": "medium",
			"Title": translateWithContext("aiDiff", "Medium"),
			"Default": true
		},
		{
			"Name": "hard",
			"Title": translateWithContext("aiDiff", "Hard")
		},
		{
			"Name": "very hard",
			"Title": translateWithContext("aiDiff", "Very Hard")
		},
		{
			"Name": "legendary",
			"Title": translateWithContext("aiDiff", "Legendary")
		}
	];
}

function loadAIBehaviors()
{
	return [
		{
			"Name": "random",
			"Title": translateWithContext("aiBehavior", "Random"),
			"Default": true
		},
		{
			"Name": "balanced",
			"Title": translateWithContext("aiBehavior", "Balanced"),
		},
		{
			"Name": "defensive",
			"Title": translateWithContext("aiBehavior", "Defensive")
		},
		{
			"Name": "aggressive",
			"Title": translateWithContext("aiBehavior", "Aggressive")
		}
	];
}

/**
 * Hardcoded, as modding is not supported without major changes.
 */
function loadMapTypes()
{
	return [
		{
			"Name": "skirmish",
			"Title": translateWithContext("map", "Skirmish"),
			"Description": translate("A map with a predefined landscape and number of players. Freely select the other game settings."),
			"Default": true,
			"Path": "maps/skirmishes/",
			"Suffix": ".xml",
			"GetData": Engine.LoadMapSettings,
			"CheckIfExists": mapPath => Engine.FileExists(mapPath + ".xml")
		},
		{
			"Name": "random",
			"Title": translateWithContext("map", "Random"),
			"Description": translate("Create a unique map with a different resource distribution each time. Freely select the number of players and teams."),
			"Path": "maps/random/",
			"Suffix": ".json",
			"GetData": mapPath => Engine.ReadJSONFile(mapPath + ".json"),
			"CheckIfExists": mapPath => Engine.FileExists(mapPath + ".json")
		},
		{
			"Name": "scenario",
			"Title": translateWithContext("map", "Scenario"),
			"Description": translate("A map with a predefined landscape and matchsettings."),
			"Path": "maps/scenarios/",
			"Suffix": ".xml",
			"GetData": Engine.LoadMapSettings,
			"CheckIfExists": mapPath => Engine.FileExists(mapPath + ".xml")
		}
	];
}

function loadBiomes()
{
	return listFiles(g_BiomesDirectory, ".json", true).filter(biomeID => biomeID != "defaultbiome").map(biomeID => {
		let description = Engine.ReadJSONFile(g_BiomesDirectory + biomeID + ".json").Description;
		return {
			"Id": biomeID,
			"Title": translateWithContext("biome definition", description.Title),
			"Description": description.Description ? translateWithContext("biome definition", description.Description) : "",
			"Preview": description.Preview || undefined
		};
	});
}

/**
 * Loads available victoryCondtions from json files.
 *
 * @returns {Array|undefined}
 */
function loadVictoryConditions()
{
	let subdir = "victory_conditions/";

	let victoryConditions = listFiles(g_SettingsDirectory + subdir, ".json", false).map(victoryScriptName => {
		let victoryCondition = loadSettingValuesFile(subdir + victoryScriptName + ".json");
		if (victoryCondition)
			victoryCondition.Name = victoryScriptName;
		return victoryCondition;
	});

	if (victoryConditions.some(victoryCondition => victoryCondition == undefined))
		return undefined;

	return victoryConditions.sort((a, b) => a.GUIOrder - b.GUIOrder || (a.Title > b.Title ? 1 : a.Title > b.Title ? -1 : 0));
}

/**
 * Loads the default player settings (like civs and colors).
 *
 * @returns {Array|undefined}
 */
function loadPlayerDefaults()
{
	var json = Engine.ReadJSONFile(g_SettingsDirectory + "player_defaults.json");
	if (!json || !json.PlayerData)
	{
		error("Could not load player_defaults.json");
		return undefined;
	}
	return json.PlayerData;
}

/**
 * Loads available population capacities.
 *
 * @returns {Array|undefined}
 */
function loadPopulationCapacities()
{
	var json = Engine.ReadJSONFile(g_SettingsDirectory + "population_capacities.json");

	if (!json || json.Default === undefined || !json.PopulationCapacities || !Array.isArray(json.PopulationCapacities))
	{
		error("Could not load population_capacities.json");
		return undefined;
	}

	return json.PopulationCapacities.map(population => ({
		"Population": population,
		"Default": population == json.Default,
		"Title": population < 10000 ? population : translate("Unlimited")
	}));
}

/**
 * Loads available world population capacities.
 *
 * @returns {Object[]|undefined} - An array of the world population capacities in the form:
 *	{ "Population": number, "Default": number, "Title": number|String }.
 */
function loadWorldPopulationCapacities()
{
	let json = Engine.ReadJSONFile(g_SettingsDirectory + "world_population_capacities.json");

	if (!json || json.Default === undefined || !json.WorldPopulationCapacities || !Array.isArray(json.WorldPopulationCapacities))
	{
		error("Could not load population_capacities.json");
		return undefined;
	}

	return json.WorldPopulationCapacities.map(population => ({
		"Population": population,
		"Default": population == json.Default,
		"Title": population < 10000 ? population : translate("Unlimited")
	}));
}

/**
 * Creates an object with all values of that property of the given setting and
 * finds the index of the default value.
 *
 * This allows easy copying of setting values to dropdown lists.
 *
 * @param {Array} settingValues
 * @returns {Object|undefined}
 */
function prepareForDropdown(settingValues)
{
	if (!settingValues)
		return undefined;

	let settings = { "Default": 0 };
	for (let index in settingValues)
	{
		for (let property in settingValues[index])
		{
			if (property == "Default")
				continue;

			if (!settings[property])
				settings[property] = [];

			// Switch property and index
			settings[property][index] = settingValues[index][property];
		}

		// Copy default value
		if (settingValues[index].Default)
			settings.Default = +index;
	}
	return deepfreeze(settings);
}

/**
 * Returns title or placeholder.
 *
 * @param {string} aiName - for example "petra"
 */
function translateAIName(aiName)
{
	let description = g_Settings.AIDescriptions.find(ai => ai.id == aiName);
	return description ? translate(description.data.name) : translateWithContext("AI name", "Unknown");
}

/**
 * Returns title or placeholder.
 *
 * @param {number} index - index of AIDifficulties
 */
function translateAIDifficulty(index)
{
	let difficulty = g_Settings.AIDifficulties[index];
	return difficulty ? difficulty.Title : translateWithContext("AI difficulty", "Unknown");
}

/**
 * Returns title or placeholder.
 *
 * @param {string} aiBehavior - for example "defensive"
 */
function translateAIBehavior(aiBehavior)
{
	let behavior = g_Settings.AIBehaviors.find(b => b.Name == aiBehavior);
	return behavior ? behavior.Title : translateWithContext("AI behavior", "Default");
}

/**
 * Returns title or placeholder.
 *
 * @param {string} mapType - for example "skirmish"
 * @returns {string}
 */
function translateMapType(mapType)
{
	let type = g_Settings.MapTypes.find(t => t.Name == mapType);
	return type ? type.Title : translateWithContext("map type", "Unknown");
}

/**
 * Returns title or placeholder "Default".
 *
 * @param {number} mapSize - tilecount
 * @returns {string}
 */
function translateMapSize(tiles)
{
	let mapSize = g_Settings.MapSizes.find(size => size.Tiles == +tiles);
	return mapSize ? mapSize.Name : translateWithContext("map size", "Default");
}

/**
 * Returns title or placeholder.
 *
 * @param {number} population
 * @param {boolean} world - Whether the entry has world population enabled.
 * @returns {string}
 */
function translatePopulationCapacity(population, world)
{
	if (world)
	{
		let popCap = g_Settings.WorldPopulationCapacities.find(p => p.Population == population);
		return popCap ? popCap.Title + " " + translateWithContext("population capacity addendum", "(world)") :
			translateWithContext("population capacity", "Unknown");
	}

	let popCap = g_Settings.PopulationCapacities.find(p => p.Population == population);
	return popCap ? popCap.Title : translateWithContext("population capacity", "Unknown");
}

/**
 * Returns title or placeholder.
 *
 * @param {string} victoryConditionName - For example "conquest".
 * @returns {string}
 */
function translateVictoryCondition(victoryConditionName)
{
	let victoryCondition = g_Settings.VictoryConditions.find(condition => condition.Name == victoryConditionName);
	return victoryCondition ? victoryCondition.Title : translate("Unknown Victory Condition");
}
