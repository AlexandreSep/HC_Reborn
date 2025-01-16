var g_LoadingPage;

function init(data)
{
	g_LoadingPage = {
		"initData": data,
		"progressBar": new ProgressBar(),
		"tipDisplay": new TipDisplay(),
		"titleDisplay": new TitleDisplay(data)
	};

	Engine.SetCursor("cursor-wait");
}
