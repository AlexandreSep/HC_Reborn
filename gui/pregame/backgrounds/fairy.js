g_BackgroundLayerData.push(
	[
		{
			"offset": (time, width) => 0.07 * width * Math.cos(0.05 * time),
			"sprite": "background-fairy-1",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => 0.05 * width * Math.cos(0.05 * time),
			"sprite": "background-fairy-2",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => -0.12 * width * Math.cos(0.05 * time),
			"sprite": "background-fairy-3",
			"tiling": false,
		},
		{
			"offset": (time, width) => -0.07 * width * Math.cos(0.05 * time),
			"sprite": "background-fairy-4",
			"tiling": false,
		},	
		{
			"offset": (time, width) => -0.32 * width * Math.cos(0.05 * time),
			"sprite": "background-fairy-5",
			"tiling": false,
		},	
	]);
