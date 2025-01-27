/**
 * The campaign setup page shows you the list of available campaigns,
 * some information about them, and lets you start a new one.
 */
class CampaignSetupPage extends AutoWatcher
{
	constructor()
	{
		super("render");

		this.selectedIndex = -1;
		this.templates = CampaignTemplate.getAvailableTemplates();

		Engine.GetGUIObjectByName("mainMenuButton").onPress = () => Engine.SwitchGuiPage("page_pregame.xml");
		Engine.GetGUIObjectByName("startCampButton").onPress = () => Engine.PushGuiPage("campaigns/new_modal/page.xml", this.selectedTemplate);

		this.campaignSelection = Engine.GetGUIObjectByName("campaignSelection");
		this.campaignSelection.onMouseLeftDoubleClickItem = () => {
			if (this.selectedIndex === -1)
				return;
			Engine.PushGuiPage("campaigns/new_modal/page.xml", this.selectedTemplate);
		};
		this.campaignSelection.onSelectionChange = () => {
			this.selectedIndex = this.campaignSelection.selected;
			if (this.selectedIndex !== -1)
				this.selectedTemplate = this.templates[this.selectedIndex];
			else
				this.selectedTemplate = null;
		};

		this._ready = true;
	}

	displayCampaignDetails()
	{
		Engine.GetGUIObjectByName("startCampButton").enabled = this.selectedIndex !== -1;

		if (!this.selectedTemplate)
		{
			Engine.GetGUIObjectByName("campaignImage").sprite = "cropped:" + 400/512 + "," + 300/512 + ":session/icons/mappreview/nopreview.png";
			Engine.GetGUIObjectByName("logoImage").sprite = "";
			return;
		}

		if ('Image' in this.selectedTemplate) {
			Engine.GetGUIObjectByName("campaignImage").sprite = "cropped:" + 100/100 + "," + 100/100 + ":" + this.selectedTemplate.Image;
			Engine.GetGUIObjectByName("logoImage").sprite = "cropped:" + 100/100 + "," + 100/100 + ":" + this.selectedTemplate.Logo;
		}
		else {
			Engine.GetGUIObjectByName("campaignImage").sprite = "cropped:" + 400/512 + "," + 300/512 + ":session/icons/mappreview/nopreview.png";
			Engine.GetGUIObjectByName("logoImage").sprite = "";
		}
		
	}

	render()
	{
		this.displayCampaignDetails();

		Engine.GetGUIObjectByName("campaignSelection").list_name = this.templates.map((camp) => translateWithContext("Campaign Template", camp.Name));
		// COList needs these changed last or crashes.
		Engine.GetGUIObjectByName("campaignSelection").list = this.templates.map((camp) => camp.identifier) || [];
		Engine.GetGUIObjectByName("campaignSelection").list_data = this.templates.map((camp) => camp.identifier) || [];
	}
}


var g_CampaignSetupPage;

function init()
{
	g_CampaignSetupPage = new CampaignSetupPage();
}
