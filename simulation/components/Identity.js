function Identity() {}

// HC-Code
Identity.prototype.AiBuildSchema =
	`<optional>
		<element name='AIBuild'>
			<interleave>
				<element name='MaxCopies' a:help='The max amount of building copies the AI considers (only works for advanced buildings)'>
					<data type='decimal' />
				</element>
				<element name='MinPop' a:help='At which pop threshold the AI considers building this copy (only works for advanced buildings)'>
					<data type='decimal' />
				</element>
				<optional>
					<element name='MinPopPerCopy' a:help='At which pop threshold the AI considers building this copy (only works for advanced buildings)'>
						<text />
					</element>
				</optional>
				<optional>
					<element name='MaxCopiesPerBase' a:help='At which pop threshold the AI considers building this copy (only works for advanced buildings)'>
						<text />
					</element>
				</optional>
			</interleave>
		</element>
	</optional>`


Identity.prototype.TechnologyNotMetSchema =
	`<optional> 
		<element name='HideIfTechnologyRequirementIsNotMet' a:help='If set to true, upgrades will not be displayed in the UI if their required technology is not researched'> 
			<data type='boolean'/> 
		</element> 
	</optional>`
// HC-End

Identity.prototype.Schema =
	"<a:help>Specifies various names and values associated with the entity, typically for GUI display to users.</a:help>" +
	"<a:example>" +
		"<Civ>athen</Civ>" +
		"<GenericName>Athenian Hoplite</GenericName>" +
		"<SpecificName>Hoplī́tēs Athēnaïkós</SpecificName>" +
		"<Icon>units/athen_infantry_spearman.png</Icon>" +
	"</a:example>" +
	"<element name='Civ' a:help='Civilization that this unit is primarily associated with, typically a 4-letter code. Choices include: gaia (world objects), skirm (skirmish map placeholders), athen (Athenians), brit (Britons), cart (Carthaginians), gaul (Gauls), iber (Iberians), kush (Kushites), mace (Macedonians), maur (Mauryas), pers (Persians), ptol (Ptolemies), rome (Romans), sele (Seleucids), spart (Spartans).'>" +
		"<text/>" +
	"</element>" +
	"<optional>" +
		"<element name='Lang' a:help='Unit language for voices.'>" +
			"<text/>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='Phenotype' a:help='Unit phenotype for voices and visual. If more than one is specified a random one will be chosen.'>" +
			"<attribute name='datatype'>" +
				"<value>tokens</value>" +
			"</attribute>" +
			"<text/>" +
		"</element>" +
	"</optional>" +
	"<element name='GenericName' a:help='Generic English-language name for this entity.'>" +
		"<text/>" +
	"</element>" +
	"<optional>" +
		"<element name='SpecificName' a:help='Specific native-language name for this entity.'>" +
			"<text/>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='SelectionGroupName' a:help='Name used to group ranked entities.'>" +
			"<text/>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='Tooltip'>" +
			"<text/>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='History'>" +
			"<text/>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='Rank'>" +
			"<choice>" +
				"<value>Basic</value>" +
				"<value>Advanced</value>" +
				"<value>Elite</value>" +
			"</choice>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='Classes' a:help='Optional list of space-separated classes applying to this entity. Choices include: AfricanElephant, AmunGuard, Animal, ApedemakGuard, Ashoka, Barter, CitizenSoldier, CivCentre, CivSpecific, ConquestCritical, Domestic, DropsiteFood, DropsiteMetal, DropsiteStone, DropsiteWood, FastMoving, FemaleCitizen, Foundation, GarrisonFortress, Human, IndianElephant, Juggernaut, KushTrireme, MercenaryCamp, Organic, Player, PtolemyIV, SeaCreature, Spy, Structure, Unit, WallLong, WallMedium, WallShort, WallTower.'>" +
			"<attribute name='datatype'>" +
				"<value>tokens</value>" +
			"</attribute>" +
			"<text/>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='VisibleClasses' a:help='Optional list of space-separated classes applying to this entity. These classes will also be visible in various GUI elements. If the classes need spaces, underscores will be replaced with spaces. Choices include: Amphitheater, Archer, ArmyCamp, Arsenal, ArtilleryTower, Axeman, Barracks, Bireme, BoltShooter, BoltTower, Bribable, Builder, Camel, Cavalry, Champion, Chariot, Citizen, City, Civic, CivilCentre, Colony, Corral, Council, Crossbowman, Defensive, Dock, Dog, Economic, Elephant, ElephantStable, Embassy, Farmstead, Field, Fireship, FishingBoat, Forge, Fortress, Gate, Gladiator, Gymnasium, Hall, Healer, Hero, House, Immortal, Infantry, Javelineer, Library, Lighthouse, Maceman, Melee, Market, Mercenary, Military, Monument, Naval, Outpost, Palace, Palisade, Pikeman, Pillar, Pyramid, Quinquereme, Ram, Range, Ranged, Relic, Resource, RotaryMill, SentryTower, Ship, Shipyard, Siege, SiegeTower, SiegeWall, Slave, Slinger, Soldier, Spearman, Stable, Stoa, StoneThrower, StoneTower, Storehouse, Support, Swordsman, Syssiton, Temple, TempleOfAmun, TempleOfApedemak, TempleOfMars, TempleOfVesta, Theater, Tower, Town, Trade, Trader, Trireme, TriumphalArch, Village, Wall, Warship, Wonder, Worker.'>" +
			"<attribute name='datatype'>" +
				"<value>tokens</value>" +
			"</attribute>" +
			"<text/>" +
		"</element>" +
	"</optional>" +
	"<element name='Icon'>" +
		"<text/>" +
	"</element>" +
	"<optional>" +
		"<element name='RequiredTechnology' a:help='Optional name of a technology which must be researched before the entity can be produced.'>" +
			"<text/>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='Controllable' a:help='Whether players can control this entity. Defaults to true.'>" +
			"<data type='boolean'/>" +
		"</element>" +
	"</optional>" +
	Identity.prototype.AiBuildSchema + // HC-Exodarion - Do you need this? Else remove
	Identity.prototype.TechnologyNotMetSchema + // HC-Exodarion - Do you need this? Else remove
	"<element name='Undeletable' a:help='Prevent players from deleting this entity.'>" +
		"<data type='boolean'/>" +
	"</element>";

Identity.prototype.Init = function()
{
	this.classesList = GetIdentityClasses(this.template);
	this.visibleClassesList = GetVisibleIdentityClasses(this.template);
	if (this.template.Phenotype)
		this.phenotype = pickRandom(this.GetPossiblePhenotypes());
	else
		this.phenotype = "default";

	this.controllable = this.template.Controllable ? this.template.Controllable == "true" : true;
};

// HC-Exodarion - Do you need this? Else remove
Identity.prototype.HasSomeFormation = function()
{
	return this.GetFormationsList().length > 0;
};

Identity.prototype.GetCiv = function()
{
	return this.template.Civ;
};

Identity.prototype.GetLang = function()
{
	return this.template.Lang || "greek"; // ugly default
};

/**
 * Get a list of possible Phenotypes.
 * @return {string[]} A list of possible phenotypes.
 */
Identity.prototype.GetPossiblePhenotypes = function()
{
	return this.template.Phenotype._string.split(/\s+/);
};

/**
 * Get the current Phenotype.
 * @return {string} The current phenotype.
 */
Identity.prototype.GetPhenotype = function()
{
	return this.phenotype;
};

Identity.prototype.GetRank = function()
{
	return this.template.Rank || "";
};

Identity.prototype.GetRankTechName = function()
{
	return this.template.Rank ? "unit_" + this.template.Rank.toLowerCase() : "";
};

Identity.prototype.GetClassesList = function()
{
	return this.classesList;
};

Identity.prototype.GetVisibleClassesList = function()
{
	return this.visibleClassesList;
};

Identity.prototype.HasClass = function(name)
{
	return this.GetClassesList().indexOf(name) != -1;
};

// HC-Exodarion - Do you need this? Else remove
Identity.prototype.GetFormationsList = function()
{
	if (this.template.Formations && this.template.Formations._string)
		return this.template.Formations._string.split(/\s+/);
	return [];
};

// HC-Exodarion - Do you need this? Else remove
Identity.prototype.CanUseFormation = function(template)
{
	return this.GetFormationsList().indexOf(template) != -1;
};

Identity.prototype.GetSelectionGroupName = function()
{
	return this.template.SelectionGroupName || "";
};

Identity.prototype.GetGenericName = function()
{
	return this.template.GenericName;
};

Identity.prototype.IsUndeletable = function()
{
	return this.template.Undeletable == "true";
};

Identity.prototype.IsControllable = function()
{
	return this.controllable;
};

Identity.prototype.SetControllable = function(controllability)
{
	this.controllable = controllability;
};

Identity.prototype.SetPhenotype = function(phenotype)
{
	this.phenotype = phenotype;
};

/**
 * @param {string} newName -
 */
Identity.prototype.SetName = function(newName)
{
	this.name = newName;
};

/**
 * @return {string} -
 */
Identity.prototype.GetName = function()
{
	return this.name || this.template.GenericName;
};

function IdentityMirage() {}
IdentityMirage.prototype.Init = function(cmpIdentity)
{
	// Mirages don't get identity classes via the template-filter, so that code can query
	// identity components via Engine.QueryInterface without having to explicitly check for mirages.
	// This is cloned as otherwise we get a reference to Identity's property,
	// and that array is deleted when serializing (as it's not seralized), which ends in OOS.
	this.classes = clone(cmpIdentity.GetClassesList());
};
IdentityMirage.prototype.GetClassesList = function() { return this.classes; };

Engine.RegisterGlobal("IdentityMirage", IdentityMirage);

Identity.prototype.Mirage = function()
{
	let mirage = new IdentityMirage();
	mirage.Init(this);
	return mirage;
};

Engine.RegisterComponentType(IID_Identity, "Identity", Identity);
