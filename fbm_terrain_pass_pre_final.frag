#version 300 es
precision highp float;

// INPUT -----------------------------
in vec2 uv;

// OUPUT -----------------------------
out vec4 oFragment_displ_norm;


// UNIFORM -----------------------------
uniform sampler2D iDispla;            // augmented terrain
uniform sampler2D iTex_grad_terrain;  // augmented terrain gradient
uniform sampler2D iTex_grad_fBm;      // fBm gradient


void main()
{
	// height of augmented terrain
    float alt_global = texture(iDispla,uv).x;

	// gradient of augmented terrain
	vec2 grad_terrain = texture(iTex_grad_terrain,uv).rg;
	vec2 grad_fBm = texture(iTex_grad_fBm,uv).rg;

    vec2 grad_global = grad_terrain.xy + grad_fBm;

	// normals of augmented terrain
    vec3 normal = normalize(vec3(-grad_global, 1.)); 

    // output
	oFragment_displ_norm = vec4(alt_global, normal);
}
