
"use strict"

//--------------------------------------------------------------------------------------------------------
// Global variables
//--------------------------------------------------------------------------------------------------------
var SZ_TERRAIN = 2048;
var SZ_MESH_TERRAIN = 512;


var prg_p1 = null;
var prg_pf = null;
var prg_ppf = null;
var prg_deriv = null;
var prg_blurR = null;
var object = null;

var last_time = 0;
var alphaZ = 0;
var rot_speed = 0.;

var texture_alt_HR = null;
var texture_river_LR = null;

var is_on_augmentation;
var is_on_map_amplitude;


var frequence_facteur;
var amplitude_facteur;

var profil_angulaire_fond;
var is_on_fBm;
var profil_angulaire_mask_down;
var profil_angulaire_mask_top;
var profil_angulaire_modulation_amplitude;

var is_on_profil_radial;

var is_on_ravine_2;
var ravine2_rapport_frequence;
var ravine2_rapport_amplitude;

var fbo1 = null;
var tex_alt_HRB1 = null;
var tex_gradient_fBm = null;
var tex_gradient_terrain =null;

var fbo2 = null;

var need_recompute = true;

var init_time;
var compute_time;


function blurR(ptex_in, nbpass_blur,output_tex)
{	
	ptex_in.simple_params(gl.CLAMP_TO_EDGE);
	let tex_fbo2h = Texture2d();
	tex_fbo2h.init(gl.R32F);
	tex_fbo2h.simple_params(gl.CLAMP_TO_EDGE);
	let fbo2h = FBO([tex_fbo2h]);
	fbo2h.resize(ptex_in.width,ptex_in.height);

	if (output_tex==null)
	{
		output_tex = Texture2d();
		output_tex.init(gl.R32F);
	}
	output_tex.simple_params(gl.CLAMP_TO_EDGE);
	let fbo2v = FBO([output_tex]);
	fbo2v.resize(ptex_in.width,ptex_in.height);


	fbo2h.bind();
	prg_blurR.bind();
	Uniforms.dtc = [1/fbo2h.width,0];
	Uniforms.TU = ptex_in.bind(0);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	fbo2v.bind();
	Uniforms.dtc = [0,1/fbo2v.height];
	Uniforms.TU = fbo2h.texture(0).bind(0);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	
	for(let i=1;i<nbpass_blur;++i)
	{
		fbo2h.bind();
		Uniforms.dtc = [1/fbo2h.width,0];
		Uniforms.TU = fbo2v.texture(0).bind(0);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		fbo2v.bind();
		Uniforms.dtc = [0,1/fbo2v.height];
		Uniforms.TU = fbo2h.texture(0).bind(0);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}
	unbind_shader();
	unbind_texture2d();

	fbo2h.gldelete();
	tex_fbo2h.gldelete();
	fbo2v.gldelete();
	return output_tex;
}


function deriv(input_tex,output_tex)
{	
	if (output_tex==null)
	{
		output_tex = Texture2d();
		output_tex.init(gl.RG32F);
	}

	output_tex.simple_params(gl.NEAREST, gl.CLAMP_TO_EDGE)
	let fbo_grad = FBO([output_tex]);
	fbo_grad.resize(input_tex.width,input_tex.height);

	fbo_grad.bind();
	prg_deriv.bind();

	Uniforms.iTexInput = input_tex.bind(0);
	Uniforms.epsilon = 1.0/input_tex.width;

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	unbind_shader();
	unbind_texture2d();

	fbo_grad.gldelete();

	return output_tex;
}

function recompute_and_update()
{
	need_recompute = true;
	update_wgl();
}

//--------------------------------------------------------------------------------------------------------
// Initialize graphics objects and GL states
//--------------------------------------------------------------------------------------------------------
function init_wgl() 
{
	init_time = Date.now();

	// creating 3D mesh
	object = Mesh.Grid(SZ_MESH_TERRAIN).renderer(0, 1, 2, 3); 


	// Graphic user interface
	UserInterface.begin(false, true);

	UserInterface.use_field_set('V', "Render");
		UserInterface.add_slider('auto rotation', 0, 100, 0, x=>{rot_speed=0.1*x; ewgl.continuous_update=(x>0);});
	UserInterface.end_use();


	UserInterface.use_field_set('V', "Enhancement parameters");
		is_on_augmentation = UserInterface.add_check_box("Add enhancement   ", 1, recompute_and_update);
		is_on_map_amplitude = UserInterface.add_check_box("Use amplitude map ", 1, recompute_and_update);
		profil_angulaire_fond = UserInterface.add_check_box("Rounded bottom    ", 1, recompute_and_update);//UserInterface.add_slider('fond arrondie', 0, 20, 10, recompute_and_update);
		is_on_profil_radial = UserInterface.add_check_box("Hide singularities", 1, recompute_and_update);
		
		UserInterface.use_field_set('V', "Amplitude");
			// UserInterface.add_br();
			UserInterface.add_label("a ∈ [0, 0.1]"); // légende
			amplitude_facteur = UserInterface.add_text_input('0.04', recompute_and_update);
		UserInterface.end_use();
		
		UserInterface.use_field_set('V', "Frequency");
			// UserInterface.add_br();
			UserInterface.add_label("f ∈ [0, 60]"); // légende
			frequence_facteur = UserInterface.add_text_input('24', recompute_and_update);
		UserInterface.end_use();

	UserInterface.end_use();


	UserInterface.use_field_set('V', "2nd level parameters  ");
		is_on_ravine_2 = UserInterface.add_check_box("Add 2nd level     ", 1, recompute_and_update);
		
		UserInterface.use_field_set('V', "Amplitude factor");
			// UserInterface.add_br();
			UserInterface.add_label("a ∈ [0, 1]"); // légende
			ravine2_rapport_amplitude = UserInterface.add_text_input('0.2', recompute_and_update);
		UserInterface.end_use();

		UserInterface.use_field_set('V', "Frequency factor");
			// UserInterface.add_br();
			UserInterface.add_label("f ∈ [1, 10]"); // légende
			ravine2_rapport_frequence = UserInterface.add_text_input('3', recompute_and_update);
		UserInterface.end_use();

	UserInterface.end_use();


	UserInterface.use_field_set('V', "Crest noise parameters");
		is_on_fBm = UserInterface.add_check_box("Add crest fBm     ", 1, recompute_and_update);
		
		UserInterface.use_field_set('V', "Vanishing threshold");
			// UserInterface.add_br();
			UserInterface.add_label("ε ∈ [0, 1]"); // légende
			profil_angulaire_mask_down = UserInterface.add_text_input('0.3', recompute_and_update);
			profil_angulaire_mask_top = 1.;//parseFloat(profil_angulaire_mask_down.value) + 0.5;
		UserInterface.end_use();

		UserInterface.use_field_set('V', "Amplitude factor");
			// UserInterface.add_br();
			UserInterface.add_label("a ∈ [0, 1]"); // légende
			profil_angulaire_modulation_amplitude = UserInterface.add_text_input('0.4', recompute_and_update);
		UserInterface.end_use();
	UserInterface.end_use();

	UserInterface.end();



	// FBO1 out: 0 = grad_rav 1&2 / 1 = fBm / 2 = displacement
	let tex_fbo1_grad_rav = Texture2d();
	tex_fbo1_grad_rav.init(gl.RGBA32F);
	tex_fbo1_grad_rav.simple_params(gl.MIRRORED_REPEAT)

	let tex_fbo1_fbm = Texture2d();
	tex_fbo1_fbm.init(gl.R32F);
	tex_fbo1_fbm.simple_params(gl.MIRRORED_REPEAT)

	let tex_fbo1_displa = Texture2d();
	tex_fbo1_displa.init(gl.R32F);
	tex_fbo1_displa.simple_params(gl.MIRRORED_REPEAT)

	fbo1 = FBO([tex_fbo1_grad_rav, tex_fbo1_fbm, tex_fbo1_displa]);
	

	// FBO2 (pre final pass) out: 0 = Displacement + Normal (RGBA32F)
	let tex_dn = Texture2d();
	tex_dn.init(gl.RGBA32F);

	fbo2 = FBO([tex_dn]);

	fbo2.resize(SZ_TERRAIN,SZ_TERRAIN);

	texture_alt_HR = Texture2d();
	texture_river_LR = Texture2d();
	pause_wgl();

	// Create and initialize a shader program
	Promise.all([
		ShaderProgramFromFiles('augmented_terrain_pass1.vert', 'augmented_terrain_pass1.frag', 'passaugmented_terrain_pass1compute'),
		ShaderProgramFromFiles('augmented_terrain_pass1.vert', 'augmented_terrain_blur.frag', 'augmented_terrain_blur'),
		ShaderProgramFromFiles('augmented_terrain_pass1.vert', 'augmented_terrain_grad.frag', 'augmented_terrain_grad'),
		ShaderProgramFromFiles('augmented_terrain_pass1.vert', 'augmented_terrain_pass_pre_final.frag', 'augmented_terrain_pass_pre_final'),
		ShaderProgramFromFiles('augmented_terrain_pass_final.vert', 'augmented_terrain_pass_final.frag', 'augmented_terrain_pass_final'),
		texture_alt_HR.load('/terrain_test_HR.png', gl.R8),
		texture_river_LR.load('/riverdist_LR.png', gl.R8)
	]).then(
		progs => {
			[prg_p1, prg_blurR, prg_deriv, prg_ppf, prg_pf,,,] = progs;
			push_fbo();
			// terrain smoothed x5
			tex_alt_HRB1 = blurR(texture_alt_HR,5,tex_alt_HRB1);
			tex_alt_HRB1.simple_params(gl.LINEAR, gl.MIRRORED_REPEAT);		

			// gradient of smoothed terrain
			tex_gradient_terrain = deriv(tex_alt_HRB1,tex_gradient_terrain);
			tex_gradient_terrain.simple_params(gl.LINEAR, gl.MIRRORED_REPEAT);
			texture_alt_HR.simple_params(gl.LINEAR, gl.MIRRORED_REPEAT);
			texture_river_LR.simple_params(gl.LINEAR, gl.MIRRORED_REPEAT);
			
			pop_fbo();    	
			update_wgl();
		});


	// camera
	ewgl.scene_camera.set_scene_radius(1.5);
	ewgl.scene_camera.look(Vec3(0, -2, 1), Vec3(0, 0, 0), Vec3(0, 0, 1)); // eye, at, up
	last_time = ewgl.current_time;

	compute_time = Date.now() - init_time;
	console.log("initialisation time: ", compute_time, " ms");
}

function draw_wgl()
{
	// automatique rotation
	let dt = ewgl.current_time - last_time;
	last_time = ewgl.current_time;
	alphaZ += rot_speed*dt;

	if (need_recompute)
	{
		init_time = Date.now();

		// PASS 1
		// FBO1 out: 0 = grad_rav 1&2 / 1 = fBm / 2 = displacement
		push_fbo();
		fbo1.resize(SZ_TERRAIN,SZ_TERRAIN);
		fbo1.bind();

		gl.disable(gl.DEPTH_TEST);

		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		prg_p1.bind();
		
		//	Uniforms
		Uniforms.iBoolAugmentation = is_on_augmentation.checked;
		Uniforms.iBoolAmplitude = is_on_map_amplitude.checked;

		Uniforms.iParamFrequence = frequence_facteur.value;
		Uniforms.iParamAmplitude = amplitude_facteur.value;

		Uniforms.iProfilAngulaireFond = profil_angulaire_fond.checked / 10.;
		Uniforms.iBoolFBM	 = is_on_fBm.checked;
		Uniforms.iProfilAngulaireMask = [profil_angulaire_mask_down.value, profil_angulaire_mask_top];
		Uniforms.iProfilAngulaireModulation = profil_angulaire_modulation_amplitude.value;

		Uniforms.iBoolProfilRadial = is_on_profil_radial.checked;

		Uniforms.iBoolRavine2 = is_on_ravine_2.checked;
		Uniforms.iRavine2 = [ravine2_rapport_amplitude.value, ravine2_rapport_frequence.value];

		Uniforms.iTerrainInput = tex_alt_HRB1.bind(0);	
		Uniforms.iTerrainGrad = tex_gradient_terrain.bind(1);
		Uniforms.iRiver = texture_river_LR.bind(2);
		
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


		// compute fBm gradient
		fbo1.texture(1).simple_params(gl.LINEAR, gl.MIRRORED_REPEAT);
		tex_gradient_fBm = deriv(fbo1.texture(1),tex_gradient_fBm);
		tex_gradient_fBm.simple_params(gl.LINEAR, gl.MIRRORED_REPEAT);




		// PASS 2 (pre_final)
		// FBO2 out: 0 = Displacement + Normal (R:displace GBA: Normal)
		fbo2.resize(SZ_TERRAIN,SZ_TERRAIN);
		fbo2.bind();

		prg_ppf.bind();

		//	Uniforms
		Uniforms.iDispla = fbo1.texture(2).bind(1);
		Uniforms.iTex_grad_terrain = tex_gradient_terrain.bind(2);
		Uniforms.iTex_grad_fBm = tex_gradient_fBm.bind(3);
		Uniforms.iTex_grad_rav = fbo1.texture(0).bind(4);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

		
		pop_fbo();
		unbind_texture2d();
		unbind_shader();

		fbo1.resize(0,0);
		need_recompute = false;


		compute_time = Date.now() - init_time;
		console.log("computation time: ", compute_time, " ms");
	}



	// PASS RENDU FINAL
	gl.enable(gl.DEPTH_TEST);
	gl.clearColor(0.4, 0.5, 0.6, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


	// view and prejection matrix
	const proj_matrix = ewgl.scene_camera.get_projection_matrix();
	const view_matrix = ewgl.scene_camera.get_view_matrix();
	const vm = view_matrix.mult(Matrix.rotateZ(alphaZ).mult(Matrix.scale(1., 1., 1.)));

	prg_pf.bind();

	//	Uniforms
	Uniforms.viewMatrix = vm;
	Uniforms.normalMatrix = vm.inverse3transpose();
	Uniforms.projectionMatrix = proj_matrix;

	Uniforms.iDN = fbo2.texture(0).bind(1);

	object.draw(gl.TRIANGLES);
	
	unbind_shader();
	unbind_texture2d();

	
}

//--------------------------------------------------------------------------------------------------------
// call window creation with your customized "init_wgl()" and "draw_wgl()" functions
//--------------------------------------------------------------------------------------------------------
ewgl.launch_3d();