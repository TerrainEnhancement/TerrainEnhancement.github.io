#version 300 es
precision highp float;

// INPUT -----------------------------
in vec2 uv;

// OUPUT -----------------------------
out vec4 oFragment_displ_norm;


// UNIFORM -----------------------------
uniform sampler2D iDispla;            // augmented terrain 				T = r1+r2+fbm+h
uniform sampler2D iTex_grad_terrain;  // terrain gradient 				Delta h
uniform sampler2D iTex_grad_fBm;      // fBm gradient 					Delta C
uniform sampler2D iTex_grad_rav;      // details gradient 				Delta r1 et r2


void main()
{
	// height of augmented terrain
    float alt_global = texture(iDispla,uv).x;

	// gradient of augmented terrain
	vec2 grad_terrain = texture(iTex_grad_terrain,uv).rg;
	vec2 grad_fBm = texture(iTex_grad_fBm,uv).rg;
	vec4 grad_rav = texture(iTex_grad_rav, uv);

    vec2 grad_global = grad_terrain.xy + grad_rav.xy + grad_rav.zw + grad_fBm;

	// normals of augmented terrain
    vec3 normal = normalize(vec3(-grad_global, 1.)); 

	oFragment_displ_norm = vec4(alt_global, normal);
}
