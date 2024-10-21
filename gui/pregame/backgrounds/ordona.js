g_BackgroundLayerData.push(
	[
		{
			"offset": (time, width) => 0.07 * width * Math.cos(0.05 * time),
			"sprite": "background-ordona-1",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => 0.03 * width * Math.cos(0.05 * time),
			"sprite": "background-ordona-2",
			"tiling": false,
		},
		
		{
			"offset": (time, width) => -0.17 * width * Math.cos(0.05 * time),
			"sprite": "background-ordona-3",
			"tiling": false,
		},
		{
			"offset": (time, width) => -0.27 * width * Math.cos(0.05 * time),
			"sprite": "background-ordona-4",
			"tiling": false,
		},	
		{
			"offset": (time, width) => -0.05 * width * Math.cos(0.05 * time),
			"sprite": "background-ordona-5",
			"tiling": false,
		},	
	]);
