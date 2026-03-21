using System.Threading.Tasks;
using System.Windows;

namespace ProductApp
{
	public partial class AutoCloseMessage : Window
	{
		public AutoCloseMessage(string message, int milliseconds = 3000)
		{
			InitializeComponent();
			MessageText.Text = message;

			Loaded += async (s, e) =>
			{
				await Task.Delay(milliseconds);
				this.Close();
			};
		}
	}
}