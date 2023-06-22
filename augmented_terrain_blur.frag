#version 300 es
precision highp float;
in vec2 uv;
uniform sampler2D TU;
uniform vec2 dtc;
out float frag_out;

const float coef[3] = float[]( 0.335568, 0.241812, 0.090404);

void main()
{
	vec2 txc = uv-2.0*dtc;
	float texel = coef[2]*texture(TU,txc).r;
	txc += dtc;
	texel += coef[1] * texture(TU,txc).r;
	txc += dtc;
	texel += coef[0] * texture(TU,txc).r;
	txc += dtc;
	texel += coef[1] * texture(TU,txc).r;
	txc += dtc;
	texel += coef[2] * texture(TU,txc).r;
	frag_out = texel;
}
