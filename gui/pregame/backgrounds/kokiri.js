g_BackgroundLayerData.push(
	[
		{
			"offset": (time, width) => -0.12 * width * Math.cos(0.05 * time),
			"sprite": "background-kokiri-1",
			"tiling": true,
		},
		
		{
			"offset": (time, width) => 0.07 * width * Math.cos(0.05 * time),
			"sprite": "background-kokiri-2",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => -0.18 * width * Math.cos(0.05 * time),
			"sprite": "background-kokiri-3",
			"tiling": false,
		},
		{
			"offset": (time, width) => -0.12 * width * Math.cos(0.05 * time),
			"sprite": "background-kokiri-4",
			"tiling": false,
		},	
		{
			"offset": (time, width) => -0.07 * width * Math.cos(0.05 * time),
			"sprite": "background-kokiri-5",
			"tiling": false,
		},	
	]);
